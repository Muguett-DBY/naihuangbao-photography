import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { AbsoluteFill, Sequence } from "remotion";
import type { LawSubjectId } from "../../../types/law";
import type { ClassroomScene } from "../../../lib/law-classroom";
import * as tts from "../../../lib/law-tts";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { C, SUBJECT_ACCENTS, VIDEO } from "../../../remotion/theme";
import { flowSceneDurationInFrames } from "../../../remotion/scenes/FlowScene";
import { mnemonicSceneDurationInFrames } from "../../../remotion/scenes/MnemonicScene";
import { timelineSceneDurationInFrames } from "../../../remotion/scenes/TimelineScene";
import { GraphicScene, graphicSceneDurationInFrames } from "../../../remotion/scenes/GraphicScene";
import { SceneView, splitMnemonic } from "./SceneView";
import { LawMascot } from "../LawMascot";
import { TeacherBubble } from "./TeacherBubble";
import { ClassroomControls, CLASSROOM_SPEEDS } from "./ClassroomControls";
import "../../../styles/law-classroom.css";

/**
 * ClassroomPlayer — 课堂播放器（主组件）。
 *
 * 把 ClassroomScene[] 编排成一个 Remotion 组合（每场一个 <Sequence>，时长按
 * 讲稿长度 + 场景动画需求确定），经 @remotion/player 的 <Player> 内嵌到页面：
 * 帧驱动画面（场景组件全部确定性渲染），底部 ClassroomControls 悬浮控制条
 * 提供 播放/暂停/上下场/拖动进度/语音开关/语速，另带键盘快捷键与奶黄包老师
 * （头像 + 讲课气泡）。TTS 与时间线同步：进入新场景朗读该场讲稿，暂停即
 * pause，恢复即 resume，拖动/切换场景由 law-tts 的队列语义自动接管（新的
 * speak 作废旧朗读），视频节奏（playbackRate）与语速共用同一个 rate。
 *
 * 集成回调（可选）：onSceneChange 把推进到的场景同步给父级记进度，
 * onFinish 在全部场景播完时通知父级收课。图解联动：LAW_GRAPHIC_MAP 命中的课
 * （convertToClassroom 追加 scene.graphic 哨兵场景）在序列尾部、quiz 哨兵之前
 * 多排一场「完整图解」——GraphicScene 帧驱动重排图解的完整知识结构，计入场次
 * 总数，但明确排除在 onSceneChange 步骤进度之外（无对应步骤，quiz 同款语义）。
 */

/* ==================== 时序：每场多长（帧） ==================== */

const MIN_SCENE_FRAMES = 90; // 3s：再短的场景也留足呼吸
const MAX_SCENE_FRAMES = 1800; // 60s：讲稿再长也封顶，避免一场拖满全片
const ANIM_MIN_FRAMES = 60; // 无专属时长 helper 的场景的动画保底
/** 朗读基准 4 字/秒（law-tts 兜底引擎同款）→ 30fps 下每字 7.5 帧 */
const FRAMES_PER_CHAR = VIDEO.fps / 4;
const TAIL_FRAMES = 15; // 0.5s 收尾余量，画面比语音多停半拍

/** 讲稿时长换算成帧：让画面与语音大致同时收束 */
function speechFrames(scene: ClassroomScene): number {
  return Math.ceil(scene.teacherScript.length * FRAMES_PER_CHAR) + TAIL_FRAMES;
}

/** 单场时长：动画需求与讲稿时长取大，再夹进 [3s, 60s] */
function sceneDuration(scene: ClassroomScene): number {
  let anim = ANIM_MIN_FRAMES;
  // 图解场景：时长由图解解说步数决定（每步 2.8s 的确定性揭示节拍），优先于 type 判断
  if (scene.graphic) anim = graphicSceneDurationInFrames(scene.graphic.captions.length);
  else if (scene.type === "flow") anim = flowSceneDurationInFrames(scene.items.length);
  else if (scene.type === "timeline") anim = timelineSceneDurationInFrames(scene.items.length);
  else if (scene.type === "mnemonic") {
    const [mnemonic, explanation] = splitMnemonic(scene.content);
    anim = mnemonicSceneDurationInFrames(mnemonic, explanation);
  }
  return Math.min(MAX_SCENE_FRAMES, Math.max(MIN_SCENE_FRAMES, anim, speechFrames(scene)));
}

/** 场景在组合里的时间轴位置（start/duration 均为帧） */
export type ClassroomSegment = {
  scene: ClassroomScene;
  start: number;
  duration: number;
};

/** 编排：依次排布每场的起止帧 */
export function buildSegments(scenes: readonly ClassroomScene[]): ClassroomSegment[] {
  let cursor = 0;
  return scenes.map((scene) => {
    const duration = sceneDuration(scene);
    const segment: ClassroomSegment = { scene, start: cursor, duration };
    cursor += duration;
    return segment;
  });
}

/* ==================== Remotion 组合 ==================== */

type ClassroomCompositionProps = {
  segments: ClassroomSegment[];
  accent: string;
};

/** 组合根：纸白铺底，每场一个 Sequence，帧号落在谁的区间就渲染谁 */
const ClassroomComposition: FC<ClassroomCompositionProps> = ({ segments, accent }) => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    {segments.map((segment) => (
      <Sequence
        key={`${segment.scene.stepId}-${segment.start}`}
        from={segment.start}
        durationInFrames={segment.duration}
        layout="none"
        name={segment.scene.title}
      >
        {/* 图解场景（scene.graphic 哨兵）→ GraphicScene 帧驱动重排图解完整结构；
            其余场景照旧走 SceneView 的类型映射 */}
        {segment.scene.graphic ? (
          <GraphicScene graphic={segment.scene.graphic} accent={accent} />
        ) : (
          <SceneView scene={segment.scene} accent={accent} />
        )}
      </Sequence>
    ))}
  </AbsoluteFill>
);

/* ==================== 主组件 ==================== */

export function ClassroomPlayer({
  scenes,
  subject,
  accent,
  autoStart = false,
  onSceneChange,
  onFinish,
  className = "",
}: {
  /** 课堂场景序列（convertToClassroom(lesson).scenes） */
  scenes: ClassroomScene[];
  /** 学科 id（栏目标签 + 学科色兜底） */
  subject: LawSubjectId;
  /** 学科强调色（场景组件的 accent） */
  accent: string;
  /** 挂载即自动播放（父级在用户手势链路里开启课堂时传 true） */
  autoStart?: boolean;
  /** 播放推进到的场景（父级同步步骤完成度；quiz 哨兵场景由父级自行取舍） */
  onSceneChange?: (scene: ClassroomScene) => void;
  /** 全部场景播完（父级收课进总结） */
  onFinish?: () => void;
  className?: string;
}) {
  const playerRef = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [ttsOn, setTtsOn] = useState(() => tts.isTtsEnabled());

  const segments = useMemo(() => buildSegments(scenes), [scenes]);
  const totalFrames = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const subjectLabel = LAW_SUBJECT_MAP[subject]?.name ?? subject;
  const accentFallback = SUBJECT_ACCENTS[subject]?.accent ?? accent;

  /** 当前场景下标：由帧号派生（自动推进/拖动/快捷键共用一条真源） */
  const segIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < segments.length; i += 1) {
      if (frame >= segments[i].start) index = i;
    }
    return index;
  }, [frame, segments]);
  const current = segments[segIndex];

  /* —— 播放器事件 → React 状态（场景游标/播放态） ——
   * 帧号不逐帧进 React 状态：组件消费的只有场景序号（角标/播报/进度/tts 同步
   * 全部由 segIndex 派生），而每秒 30 次的 setFrame 会与 Remotion 播放循环自身
   * 的每帧 setState 叠加，触发 React 嵌套更新上限（Maximum update depth exceeded）。
   * 这里只在"跨场景（或 0↔正，代表播放已启动）"时落一次 state，React 对相同
   * 返回值直接 bail-out，重渲染频率从 30/s 降到场景切换频率。 */
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const indexAt = (frame: number) => {
      let index = 0;
      const list = segmentsRef.current;
      for (let i = 0; i < list.length; i += 1) {
        if (frame >= list[i].start) index = i;
      }
      return index;
    };
    const onFrameUpdate = (event: { detail: { frame: number } }) => {
      const next = event.detail.frame;
      setFrame((prev) => {
        if (next === prev) return prev;
        if ((prev > 0) === (next > 0) && indexAt(next) === indexAt(prev)) return prev;
        return next;
      });
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrameUpdate);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onPause);
    // autoStart 的自动播放发生在 <Player>（子组件）的 effect 里且同步派发 play，
    // 早于本订阅 —— 挂载后按播放器真实播放态对齐一次，否则首次点播放会变成
    // 一次"看不见的暂停"（内部在播、界面停在暂停态），要按两下才真正开播。
    setPlaying(player.isPlaying());
    return () => {
      player.removeEventListener("frameupdate", onFrameUpdate);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onPause);
    };
  }, []);

  /* —— 集成回调走 ref：父级内联箭头函数不破坏订阅 —— */
  const sceneChangeRef = useRef(onSceneChange);
  sceneChangeRef.current = onSceneChange;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const announcedRef = useRef(-1);
  useEffect(() => {
    if (!current) return;
    if (playing || frame > 0) {
      if (announcedRef.current !== segIndex) {
        announcedRef.current = segIndex;
        // 图解场景（stepId="graphic" 哨兵）明确排除在步骤进度之外：它无对应
        // 原始步骤，上报会让父级 markStepDone 写入幻影步骤、把「已掌握 N 步」
        // 虚增到总步数之外（quiz 哨兵同款语义，在父级 onSceneChange 里排除）。
        // 场次计数（第 x/共 N 场、进度条、TTS 播报）仍正常包含它。
        if (!current.scene.graphic) {
          sceneChangeRef.current?.(current.scene);
        }
      }
    }
  }, [current, segIndex, playing, frame]);

  const finishedRef = useRef(false);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onEnded = () => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        finishRef.current?.();
      }
    };
    player.addEventListener("ended", onEnded);
    return () => player.removeEventListener("ended", onEnded);
  }, []);

  /* —— TTS 同步：场景/播放态变化即重新对齐；语速变化走热更新，绝不重讲 ——
   * 播放中进入新场景 → 朗读该场讲稿（law-tts 队列语义自动作废旧朗读）；
   * 暂停 → tts.pause()（引擎 1 真暂停，恢复续读；节拍模拟引擎不支持则自然停）；
   * 关语音 → cancel 并作废续读标记；拖动/切场 → key 变了 → 从头读新场景。
   * spokenKey 刻意不含语速：中途变速不应把整段从头重读，画面也不重置 ——
   * 语速走下方 tts.setPlaybackRate 热更新（引擎 1 当前音频原地变速续走，
   * 引擎 2 记录新语速对下一句生效，utterance 无法热改、不打断当前句）。 */
  /** 最新语速走 ref：语速变化只触发热更新 effect，不重跑场景对齐 effect（不重讲） */
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const spokenKeyRef = useRef("");
  useEffect(() => {
    if (!playing) {
      tts.pause();
      return;
    }
    if (!ttsOn) {
      tts.cancel();
      spokenKeyRef.current = "";
      return;
    }
    if (!current) return;
    const key = `${current.scene.stepId}@${current.start}`;
    if (spokenKeyRef.current === key) {
      tts.resume();
      return;
    }
    spokenKeyRef.current = key;
    tts.speak(current.scene.teacherScript, { rate: rateRef.current });
  }, [playing, ttsOn, current]);

  /* —— 语速热更新：变速即时生效（含 Player 画面 playbackRate），朗读只变速不重讲 —— */
  useEffect(() => {
    tts.setPlaybackRate(rate);
  }, [rate]);

  // 卸载收声：离开课堂绝不留下背台词的奶黄包
  useEffect(() => () => tts.cancel(), []);

  /* —— 操作 —— */
  const seekToScene = useCallback(
    (index: number) => {
      if (segments.length === 0 || !playerRef.current) return;
      const clamped = Math.min(Math.max(index, 0), segments.length - 1);
      playerRef.current.seekTo(segments[clamped].start);
    },
    [segments],
  );

  const toggleTts = useCallback(() => {
    setTtsOn((on) => {
      tts.setTtsEnabled(!on);
      spokenKeyRef.current = ""; // 重开语音时从当前场景重新开口
      return !on;
    });
  }, []);

  /* —— 键盘快捷键：焦点在播放器内（非原生控件上）即生效 —— */
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, select, [role=option]")) return;
      const player = playerRef.current;
      switch (event.key) {
        case " ":
        case "Spacebar":
        case "k":
        case "K":
          event.preventDefault();
          event.stopPropagation();
          player?.toggle();
          break;
        case "ArrowLeft":
          event.preventDefault();
          event.stopPropagation();
          seekToScene(segIndex - 1);
          break;
        case "ArrowRight":
          event.preventDefault();
          event.stopPropagation();
          seekToScene(segIndex + 1);
          break;
        case "ArrowUp":
        case "ArrowDown": {
          event.preventDefault();
          event.stopPropagation();
          const at = CLASSROOM_SPEEDS.findIndex((speed) => speed >= rate);
          const step = event.key === "ArrowUp" ? 1 : -1;
          setRate(CLASSROOM_SPEEDS[(at + step + CLASSROOM_SPEEDS.length) % CLASSROOM_SPEEDS.length]);
          break;
        }
        case "m":
        case "M":
          event.stopPropagation();
          toggleTts();
          break;
        case "Home":
          event.preventDefault();
          event.stopPropagation();
          seekToScene(0);
          break;
        case "End":
          event.preventDefault();
          event.stopPropagation();
          seekToScene(segments.length - 1);
          break;
        default:
          break;
      }
    },
    [rate, segIndex, seekToScene, segments.length, toggleTts],
  );

  const compositionProps = useMemo<ClassroomCompositionProps>(
    () => ({ segments, accent }),
    [segments, accent],
  );

  /* —— 空课堂：没有可播的场景，给一张安静的状态卡 —— */
  if (segments.length === 0) {
    return (
      <div className={`law-classroom law-classroom-player ${className}`.trim()} style={{ "--cls-accent": accentFallback } as CSSProperties}>
        <p className="law-classroom-player__empty" role="status">
          这一课还没有可播放的课堂内容，先用普通步骤模式学习吧。
        </p>
      </div>
    );
  }

  return (
    <div
      className={`law-classroom law-classroom-player ${className}`.trim()}
      style={{ "--cls-accent": accent || accentFallback } as CSSProperties}
      role="region"
      aria-label={`${subjectLabel}课堂播放器：空格播放暂停，左右键切场景，上下键调语速，M 键开关语音`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* 竖版课堂画面（Remotion 组合经 <Player> 内嵌，自带确定性帧动画） */}
      <div className="law-classroom-player__screen">
        <Player
          ref={playerRef}
          component={ClassroomComposition}
          inputProps={compositionProps}
          durationInFrames={Math.max(totalFrames, 1)}
          compositionWidth={VIDEO.width}
          compositionHeight={VIDEO.height}
          fps={VIDEO.fps}
          playbackRate={rate}
          controls={false}
          clickToPlay
          spaceKeyToPlayOrPause={false}
          moveToBeginningWhenEnded={false}
          autoPlay={autoStart}
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      {/* 场次指示只保留进度条右侧的 1/N 与读屏播报（悬浮角标曾压住场景内部
          的「概念场景 · CONCEPT」标签，极简原则直接移除冗余层） */}
</div>

      {/* 读屏用的场景播报（视觉上由进度条与角标呈现） */}
      <p className="law-classroom-player__sronly" role="status">
        第 {segIndex + 1} 场，共 {segments.length} 场：{current?.scene.title ?? ""}
      </p>

      {/* 奶黄包老师角：头像 + 讲课气泡（打字机逐字出稿） */}
      <div className="law-classroom-player__teacher">
        <LawMascot mood={playing ? (ttsOn ? "cheer" : "happy") : "idle"} size={52} />
        <TeacherBubble script={current?.scene.teacherScript ?? ""} isSpeaking={playing && ttsOn} compact />
      </div>

      <ClassroomControls
        playing={playing}
        onTogglePlay={() => playerRef.current?.toggle()}
        currentIndex={segIndex}
        total={segments.length}
        onPrev={() => seekToScene(segIndex - 1)}
        onNext={() => seekToScene(segIndex + 1)}
        ttsEnabled={ttsOn}
        onToggleTts={toggleTts}
        rate={rate}
        onRateChange={setRate}
        onSeek={seekToScene}
      />

      <p className="law-classroom-controls__hints" aria-hidden="true">
        <kbd>空格</kbd> 播放 / 暂停 · <kbd>←</kbd>
        <kbd>→</kbd> 切场景 · <kbd>↑</kbd>
        <kbd>↓</kbd> 语速 · <kbd>M</kbd> 语音 · 🎓 回步骤模式
      </p>
    </div>
  );
}
