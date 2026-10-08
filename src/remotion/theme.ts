import type { CSSProperties } from "react";
import type { ClassroomSceneType } from "../lib/law-classroom";
import type { LawSubjectId } from "../types/law";

/**
 * 法硕课堂视频 · 设计令牌
 * 模式沿用视频引擎测试 theme.ts：有限调色板（写死的色值，全片只用这些）
 * + Noto Serif SC 字体栈 + 安全区 + 帧精确动画时序。
 * 中性色取自 src/styles/law-classroom.css 的极简风设计系统；
 * 学科强调色与 src/data/law/meta.ts 的 LAW_SUBJECTS（accent/accentSoft）逐字对应。
 */

/** 画布规格：1080×1920 竖版 · 30fps —— 帧精确时序全部以此为基准 */
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** 有限调色板：全片只用这些色值，强调色一律走学科色（SUBJECT_ACCENTS） */
export const C = {
  ink: "#322a28", // 近黑暖墨（正文，同 --cls-ink）
  paper: "#fafafa", // 纸白背景（同 --cls-bg）
  surface: "#ffffff", // 卡片面（同 --cls-surface）
  gray: "#8a7e76", // 次级文字（同 --cls-muted）
  line: "#ded7d2", // 发丝线（--cls-line 的不透明落法）
  ok: "#5c8264", // 正确/成立（同 --cls-ok）
  err: "#b1544e", // 错误/注意（同 --cls-err）
} as const;

/** 学科色 —— 与 src/data/law/meta.ts 的 accent/accentSoft 一一对应；Record 键保证五科齐全 */
export const SUBJECT_ACCENTS: Record<
  LawSubjectId,
  { accent: string; accentSoft: string }
> = {
  falixue: { accent: "#6f9277", accentSoft: "#e7efe7" }, // 法理学
  xianfa: { accent: "#b1544e", accentSoft: "#f6e5e2" }, // 宪法学
  zhishixiang: { accent: "#a9853f", accentSoft: "#f3ecd9" }, // 法制史
  minfa: { accent: "#5f7fae", accentSoft: "#e6ecf6" }, // 民法
  xingfa: { accent: "#96608f", accentSoft: "#efe6ee" }, // 刑法
};

/**
 * 步骤类型 → 图形化图标与中文标签（SceneChrome 徽标 + 各场景条目前缀共用）。
 * Record 键覆盖 ClassroomSceneType 全部九类，新类型漏配直接编译报错。
 */
export interface StepTypeMeta {
  /** 图形化符号：徽标与条目前缀共用（升级清单：✓/⚠/？由 chrome 的 StepMark 承接） */
  icon: string;
  /** 类型关键词：定义/列举/对比/时间线/要件/例外/流程/口诀/测验 */
  label: string;
  /** 徽标展示名：如「概念场景」「随堂小测」 */
  scene: string;
  /** 英文小字：沿用各场景头部「概念场景 · CONCEPT」的惯例 */
  en: string;
}

export const STEP_TYPE_META: Record<ClassroomSceneType, StepTypeMeta> = {
  concept: { icon: "📖", label: "定义", scene: "概念场景", en: "CONCEPT" },
  list: { icon: "🗂️", label: "列举", scene: "列举场景", en: "LIST" },
  compare: { icon: "⚖️", label: "对比", scene: "对比场景", en: "COMPARE" },
  checklist: { icon: "🔑", label: "要件", scene: "要件清单", en: "CHECKLIST" },
  timeline: { icon: "🕰️", label: "时间线", scene: "时间线场景", en: "TIMELINE" },
  alert: { icon: "⚠️", label: "例外", scene: "例外警示", en: "EXCEPTION" },
  flow: { icon: "🔗", label: "流程", scene: "流程场景", en: "FLOW" },
  mnemonic: { icon: "🧠", label: "口诀", scene: "口诀场景", en: "MNEMONIC" },
  quiz: { icon: "❓", label: "测验", scene: "随堂小测", en: "QUIZ" },
};

/** 字体栈：系统已装 Noto Serif SC 全字重（Black/SemiBold 为独立家族名）+ Georgia */
export const F = {
  zhBlack: '"Noto Serif SC Black","Noto Serif SC",serif',
  zhSerifSemi: '"Noto Serif SC SemiBold","Noto Serif SC",serif',
  zhSerif: '"Noto Serif SC","SimSun",serif',
  enSerif: 'Georgia,"Times New Roman",serif',
  zhSans: '"Noto Sans SC","Microsoft YaHei",sans-serif',
} as const;

/** 安全区：x∈[75,1005]、y∈[134,1620]（y>1620 是烧录字幕带，禁入）——与视频引擎同一规格 */
export const SAFE = { left: 75, right: 1005, top: 134, bottom: 1620 } as const;
export const PAD_X = 75;

/** 安全区内内容宽度（1080 − 75×2） */
export const CONTENT_WIDTH = (SAFE.right - SAFE.left) as number; // 930

/** 帧精确动画时序（30fps 基准）：所有概念场景共用同一节奏 */
export const T = {
  titleIn: 6, // 标题起跳帧
  ruleIn: 14, // 强调色横杠起跳帧
  bodyIn: 24, // 正文第一段起跳帧
  bodyStagger: 9, // 相邻段落错峰帧数
  termIn: 34, // 术语高亮起跳帧
  termStagger: 5, // 相邻术语错峰帧数
  pulseFrames: 48, // 术语脉冲一个循环的帧数（≈1.6s）
} as const;

/** spring 预设：统一弹性手感（overshootClamping: false = 保留自然回弹） */
export const SPRING = {
  title: { damping: 18, stiffness: 130, mass: 0.9, overshootClamping: false },
  soft: { damping: 24, stiffness: 120, mass: 1, overshootClamping: false },
  term: { damping: 14, stiffness: 170, mass: 1, overshootClamping: false },
} as const;

/** 十六进制色 → rgba 字符串：动画透明度都从这里落，不依赖 color-mix；
 *  解析失败时按墨色兜底，保证渲染永不产出非法色值 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return `rgba(50, 42, 40, ${a})`;
  const full =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : m[1];
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** 场景根容器：整画布铺底 + 安区内边距（字幕带禁入由 SAFE 兜住） */
export const sceneFrameStyle: CSSProperties = {
  backgroundColor: C.paper,
  paddingLeft: SAFE.left,
  paddingRight: VIDEO.width - SAFE.right,
  paddingTop: SAFE.top,
  paddingBottom: VIDEO.height - SAFE.bottom,
};
