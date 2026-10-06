import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LawLesson, LawQuizItem, LawStep } from "../../../types/law";
import { convertToClassroom, isClassroomCompatible, speakScene } from "../../../lib/law-classroom";
import { markStepDone } from "../../../lib/law-progress";
import * as tts from "../../../lib/law-tts";
import { StepStage } from "../player/StepStage";
import { ClassroomStage } from "./ClassroomStage";
import { ClassroomControls } from "./ClassroomControls";

/**
 * ClassroomPlayer — 课堂舞台区总成：课堂模式开/关的双态切换。
 *
 * - 课堂开：场景序列播放——ClassroomStage 渲染当前场景，ClassroomControls
 *   负责播放/上下场/TTS 开关/语速/进度；讲稿由 law-tts 朗读，读完自动推进
 *   下一场（视频化课堂）。推进到的场景把对应步骤记为完成（进度不丢）。
 * - 课堂关（或分层课全文未水合、课无实质内容）：回退既有 StepStage 步骤
 *   学习态，行为与旧版完全一致。
 */

export function ClassroomPlayer({
  classroomOn,
  blocked,
  lesson,
  quizItems,
  step,
  enterKey,
  direction,
  accent,
  accentSoft,
  stageRef,
  onStageDone,
  onSceneStepDone,
  onComplete,
  onQuizDone,
}: {
  /** 课堂模式总开关（用户 🎓 偏好） */
  classroomOn: boolean;
  /** 分层课全文未水合：场景序列不完整，课堂不可开，回退步骤态 */
  blocked: boolean;
  lesson: LawLesson;
  /** 随堂测题目（quiz 场景的答题界面用） */
  quizItems: LawQuizItem[];
  /** 当前步骤（步骤态渲染 StepStage 用） */
  step: LawStep | undefined;
  /** 步骤态入场动画 key（换步/重播触发滑入） */
  enterKey: string;
  /** 步骤行进方向（1 前进 / -1 后退） */
  direction: number;
  accent: string;
  accentSoft: string;
  /** 换步滚动锚点（父级把舞台滚回视口顶部） */
  stageRef: RefObject<HTMLDivElement | null>;
  /** 步骤态：互动完成回调（沿用既有完成链路） */
  onStageDone: () => void;
  /** 课堂态：场景推进把步骤记为完成（父级同步点阵/计数状态） */
  onSceneStepDone: (stepId: string) => void;
  /** 课堂态：全部场景讲完（父级收课进总结页） */
  onComplete: () => void;
  /** 课堂态：随堂测完成（父级记分进结果页） */
  onQuizDone: (correct: number, answered: number) => void;
}) {
  const reduced = useReducedMotion();
  const scenes = useMemo(() => convertToClassroom(lesson).scenes, [lesson]);
  const ready = classroomOn && !blocked && scenes.length > 0 && isClassroomCompatible(lesson);

  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [ttsOn, setTtsOn] = useState(() => tts.isTtsEnabled());

  // 开课堂的上升沿：从当前步骤对应的场景接着讲，并自动开始播放
  const wasOnRef = useRef(classroomOn);
  useEffect(() => {
    if (classroomOn && !wasOnRef.current) {
      const at = scenes.findIndex((s) => s.stepId === step?.id);
      setSceneIndex(at >= 0 ? at : 0);
      setPlaying(true);
    }
    wasOnRef.current = classroomOn;
  });

  // 播放引擎：朗读当前场景讲稿，读完自动推进；静音时不朗读也不自动推进（等手动 ⏭）
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (sceneIndex + 1 >= scenes.length) {
      setPlaying(false);
      if (!blocked) onComplete(); // 全文未水合：停在末场景等水合，不提前收课
      return;
    }
    setSceneIndex(sceneIndex + 1);
  };

  const sceneDoneRef = useRef(onSceneStepDone);
  sceneDoneRef.current = onSceneStepDone;

  useEffect(() => {
    const scene = scenes[sceneIndex];
    if (!playing || !scene) return;
    if (scene.stepId !== "quiz") {
      markStepDone(lesson.id, scene.stepId);
      sceneDoneRef.current(scene.stepId);
    }
    if (!ttsOn) return;
    let cancelled = false;
    speakScene(scene, {
      rate,
      onEnd: () => {
        if (!cancelled) advanceRef.current();
      },
    });
    return () => {
      cancelled = true;
      tts.cancel();
    };
  }, [scenes, sceneIndex, playing, ttsOn, rate, lesson.id]);

  if (!ready) {
    return (
      <motion.div
        ref={stageRef}
        className="law-player__stage"
        key={enterKey}
        initial={reduced ? false : { opacity: 0, x: 20 * direction }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.22 }}
      >
        {step ? (
          <StepStage step={step} accent={accent} accentSoft={accentSoft} onDone={onStageDone} />
        ) : blocked ? (
          <p className="law-player__restloading" role="status">正在加载本课剩余全文……</p>
        ) : null}
      </motion.div>
    );
  }

  const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
  return (
    <ClassroomStage
      scene={scene}
      quizItems={quizItems}
      onQuizFinish={(correct, answered) => {
        setPlaying(false);
        onQuizDone(correct, answered);
      }}
    >
      <ClassroomControls
        playing={playing}
        onTogglePlay={() => setPlaying((value) => !value)}
        currentIndex={sceneIndex}
        total={scenes.length}
        onPrev={() => setSceneIndex((index) => Math.max(0, index - 1))}
        onNext={() => advanceRef.current()}
        ttsEnabled={ttsOn}
        onToggleTts={() => {
          tts.setTtsEnabled(!ttsOn);
          setTtsOn(!ttsOn);
        }}
        rate={rate}
        onRateChange={setRate}
        onSeek={setSceneIndex}
      />
    </ClassroomStage>
  );
}
