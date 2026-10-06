import { motion, useReducedMotion } from "framer-motion";
import "../../../styles/law-classroom.css";

/**
 * ClassroomControls — 课堂底部控制条（毛玻璃、悬浮底部、极简）。
 *
 * 播放/暂停 · 上一场景/下一场景 · TTS 开关 · 语速调节 · 进度条 + 快捷键提示。
 * 受控组件：播放状态与场景游标由父级（ClassroomPlayer 的播放引擎）持有，
 * 这里只发回调。进度条可直接拖动跳场景（onSeek）。全部控件可聚焦、
 * ARIA 标签完整，快捷键同时标注在 aria-keyshortcuts 上。
 */

/** 语速档位（与 law-tts 的 0.5–2.0 区间一致，取常用五档循环切换） */
export const CLASSROOM_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export interface ClassroomControlsProps {
  /** 是否正在播放（父级播放引擎的状态） */
  playing: boolean;
  onTogglePlay: () => void;
  /** 当前场景序号（0-based）与总场景数 */
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** TTS 开关（持久化在 law-tts 内部，父级只转发状态） */
  ttsEnabled: boolean;
  onToggleTts: () => void;
  /** 朗读语速 0.5–2.0（同时作用于画面 playbackRate） */
  rate: number;
  onRateChange: (rate: number) => void;
  /** 拖动进度条跳转场景；不传则进度条只作展示 */
  onSeek?: (index: number) => void;
  className?: string;
}

export function ClassroomControls({
  playing,
  onTogglePlay,
  currentIndex,
  total,
  onPrev,
  onNext,
  ttsEnabled,
  onToggleTts,
  rate,
  onRateChange,
  onSeek,
  className = "",
}: ClassroomControlsProps) {
  const reduced = useReducedMotion();
  const empty = total <= 0;
  const canPrev = !empty && currentIndex > 0;
  const canNext = !empty && currentIndex < total - 1;
  const progress = empty ? 0 : Math.min(100, Math.max(0, ((currentIndex + 1) / total) * 100));

  function cycleRate() {
    const at = CLASSROOM_SPEEDS.findIndex((speed) => speed >= rate);
    const next = CLASSROOM_SPEEDS[(at + 1 + CLASSROOM_SPEEDS.length) % CLASSROOM_SPEEDS.length];
    onRateChange(next);
  }

  return (
    <motion.div
      className={`law-classroom-controls ${className}`.trim()}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* 进度条：拖动跳场景；展示层同步一条学科色进度 */}
      <div className="law-classroom-controls__progress">
        <input
          type="range"
          className="law-classroom-controls__range"
          min={0}
          max={Math.max(total - 1, 0)}
          step={1}
          value={Math.min(currentIndex, Math.max(total - 1, 0))}
          onChange={(event) => onSeek?.(Number(event.target.value))}
          disabled={empty || !onSeek}
          aria-label="课堂进度"
          aria-valuetext={`第 ${currentIndex + 1} 场，共 ${total} 场`}
        />
        <div className="law-classroom-controls__meter" aria-hidden="true">
          <span className="law-classroom-controls__meter-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="law-classroom-controls__counter" aria-hidden="true">
          {empty ? "—" : `${currentIndex + 1} / ${total}`}
        </span>
      </div>

      <div className="law-classroom-controls__main" role="group" aria-label="课堂播放控制">
        <button
          type="button"
          className="law-classroom-controls__btn"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="上一场景"
          aria-keyshortcuts="ArrowLeft"
          title="上一场景（←）"
        >
          ⏮
        </button>

        <button
          type="button"
          className={`law-classroom-controls__btn law-classroom-controls__btn--play ${playing ? "is-playing" : ""}`}
          onClick={onTogglePlay}
          disabled={empty}
          aria-label={playing ? "暂停" : "播放"}
          aria-pressed={playing}
          aria-keyshortcuts="Space k"
          title={playing ? "暂停讲课（空格）" : "开始讲课（空格）"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button
          type="button"
          className="law-classroom-controls__btn"
          onClick={onNext}
          disabled={!canNext}
          aria-label="下一场景"
          aria-keyshortcuts="ArrowRight"
          title="下一场景（→）"
        >
          ⏭
        </button>

        <span className="law-classroom-controls__divider" aria-hidden="true" />

        <button
          type="button"
          className={`law-classroom-controls__btn ${ttsEnabled ? "is-on" : ""}`}
          onClick={onToggleTts}
          aria-pressed={ttsEnabled}
          aria-label={ttsEnabled ? "关闭语音讲解" : "开启语音讲解"}
          aria-keyshortcuts="m"
          title={ttsEnabled ? "语音讲解：开（M）" : "语音讲解：关（M）"}
        >
          {ttsEnabled ? "🔊" : "🔇"}
        </button>

        <button
          type="button"
          className="law-classroom-controls__btn law-classroom-controls__btn--speed"
          onClick={cycleRate}
          aria-label={`朗读速度 ${rate} 倍，点击切换`}
          aria-keyshortcuts="ArrowUp ArrowDown"
          title="调节朗读速度（↑↓）"
        >
          {rate}×
        </button>
      </div>
    </motion.div>
  );
}
