import type { CSSProperties } from "react";
import type { ClassroomSceneType } from "../lib/law-classroom";
import type { LawSubjectId } from "../types/law";

/**
 * 法硕课堂视频 · 设计令牌（Apple 黑白灰极简：与页面层 law-academy 灰阶令牌同源）。
 * 模式沿用视频引擎测试 theme.ts：有限调色板（写死的色值，全片只用这些）
 * + 字体栈 + 安全区 + 帧精确动画时序。
 *
 * 三层底色（画布恒亮）：surface #FFFFFF 纯白画布与卡面 / paper #F5F5F7 浅灰
 * 分区底（卡内嵌块、轨道、胶囊标签底）/ line #D2D2D7 发丝线（卡描边、列表分组）。
 * 彩色预算 7 槽封顶：苹果蓝 1（术语下划线，全局唯一交互色）+ 五科锚点 5（仅
 * 学科标识点/进度/选中态）+ 语义红 1（仅错误/警示）。对比度红线均为白底实测：
 * ink 16.83:1、gray 5.07:1（AA）、蓝作图形 4.70:1、锚点作小字 5.02-6.04:1、
 * 红 5.38:1。
 */

/** 画布规格：1080×1920 竖版 · 30fps —— 帧精确时序全部以此为基准 */
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** 有限调色板：全片只用这些色值（灰阶三层底 + 蓝/红语义色 + 五科锚点） */
export const C = {
  ink: "#1D1D1F", // 正文主墨（白底 16.83:1 AAA）
  paper: "#F5F5F7", // 浅灰分区底（卡内嵌块/轨道/胶囊标签底）
  surface: "#FFFFFF", // 纯白画布 + 卡面（--law-surface）
  gray: "#6E6E73", // 次级文字（白底 5.07:1 AA）
  line: "#D2D2D7", // 发丝线（卡描边/列表分组专用）
  blue: "#0071E3", // 苹果蓝：全局唯一交互色——术语下划线/选中（白底 4.70:1）
  err: "#D70015", // 语义红：仅错误/警示（白底 5.38:1；SceneView alert 场覆盖色同源）
} as const;

/**
 * 学科锚点（画布恒亮，取亮色值）：只允许出现在学科标识点/进度/选中态
 * （SceneChrome 底部进度点）。白底实测 5.02-6.04:1，作小字达标。
 * accent/ink 为同值双名（组合层 ClassroomPlayer 分别读 .accent/.ink 接线，
 * 保留双字段以不改组合层调用点）；可爱期粉彩字段（pastel/accentSoft）已退役。
 */
export const SUBJECT_ACCENTS: Record<LawSubjectId, { accent: string; ink: string }> = {
  falixue: { accent: "#1F7A3D", ink: "#1F7A3D" }, // 法理学 · 绿锚点（白底 5.37:1）
  xianfa: { accent: "#5856D6", ink: "#5856D6" }, // 宪法 · 靛蓝锚点（白底 5.65:1）
  zhishixiang: { accent: "#C93400", ink: "#C93400" }, // 法制史 · 青铜锚点（白底 5.28:1）
  minfa: { accent: "#0F7B83", ink: "#0F7B83" }, // 民法 · 青绿锚点（白底 5.02:1）
  xingfa: { accent: "#8944AB", ink: "#8944AB" }, // 刑法 · 紫锚点（白底 6.04:1）
};

/**
 * 步骤类型 → 单色几何符号与中文标签（SceneChrome 徽标共用）。
 * Record 键覆盖 ClassroomSceneType 全部九类，新类型漏配直接编译报错。
 * icon 为灰阶几何符号（渲染色由调用点给 ink/alert 红），彩色 emoji 已退役。
 */
export interface StepTypeMeta {
  /** 单色几何符号：徽标前缀（aria-hidden 装饰） */
  icon: string;
  /** 类型关键词：定义/列举/对比/时间线/要件/例外/流程/口诀/测验 */
  label: string;
  /** 徽标展示名：如「概念场景」「随堂小测」 */
  scene: string;
  /** 英文小字：备用字段（当前场景头部不展示，保留给字幕/检索） */
  en: string;
}

export const STEP_TYPE_META: Record<ClassroomSceneType, StepTypeMeta> = {
  concept: { icon: "◆", label: "定义", scene: "概念场景", en: "CONCEPT" },
  list: { icon: "≡", label: "列举", scene: "列举场景", en: "LIST" },
  compare: { icon: "⇄", label: "对比", scene: "对比场景", en: "COMPARE" },
  checklist: { icon: "✓", label: "要件", scene: "要件清单", en: "CHECKLIST" },
  timeline: { icon: "▬", label: "时间线", scene: "时间线场景", en: "TIMELINE" },
  alert: { icon: "▲", label: "例外", scene: "例外警示", en: "EXCEPTION" },
  flow: { icon: "→", label: "流程", scene: "流程场景", en: "FLOW" },
  mnemonic: { icon: "◉", label: "口诀", scene: "口诀场景", en: "MNEMONIC" },
  quiz: { icon: "？", label: "测验", scene: "随堂小测", en: "QUIZ" },
};

/**
 * 字体栈 F（Apple 极简：一族无衬线，层级只靠字重 400/600/700 与字号）：
 * zhBlack/zhSerifSemi/zhSerif 同栈不同 weight——键名保留（组合层与全部场景
 * 调用点不改名），语义见各场景 fontWeight；enSerif 转等宽数字栈（序号/年份/
 * 「1 / N」步进数字）。文楷（--font-note）从视频全量退役。
 */
const SANS = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
const MONO = '"SF Mono",ui-monospace,"Cascadia Mono",Consolas,monospace';

export const F = {
  heading: SANS,
  zhBlack: SANS, // 大标题：weight 700
  zhSerifSemi: SANS, // 小标题/强调：weight 600
  zhSerif: SANS, // 正文：weight 400
  enSerif: MONO, // 数字（序号/年份/步进计数）
  zhSans: SANS,
} as const;

/** 安全区：x∈[75,1005]、y∈[134,1620]（y>1620 是烧录字幕带，禁入）——与视频引擎同一规格 */
export const SAFE = { left: 75, right: 1005, top: 134, bottom: 1620 } as const;
export const PAD_X = 75;

/** 安全区内内容宽度（1080 − 75×2） */
export const CONTENT_WIDTH = (SAFE.right - SAFE.left) as number; // 930

/** 帧精确动画时序（30fps 基准）：所有概念场景共用同一节奏 */
export const T = {
  titleIn: 6, // 标题起跳帧
  ruleIn: 14, // 强调横杠起跳帧
  bodyIn: 24, // 正文第一段起跳帧
  bodyStagger: 9, // 相邻段落错峰帧数
  termIn: 34, // 术语下划线起跳帧
  termStagger: 5, // 相邻术语错峰帧数
} as const;

/**
 * spring 预设（Apple 化）：统一 damping≥28 + overshootClamping:true，
 * 无回弹无过冲，配合 useRiseIn/useStamp 的 200-300ms ease-out 入场。
 * 可爱期 SPRING.bouncy（damping 9 的 Q 弹）已退役。
 */
export const SPRING = {
  title: { damping: 34, stiffness: 200, mass: 1, overshootClamping: true },
  soft: { damping: 28, stiffness: 160, mass: 1, overshootClamping: true },
  term: { damping: 28, stiffness: 220, mass: 1, overshootClamping: true },
} as const;

/** 圆角令牌（1080 画布）：浮层与卡三层递减，胶囊仅小标签 */
export const RADIUS = {
  card: 40, // 标准卡（--law-radius-card 16px 的画布等价）
  inner: 28, // 内嵌块/结构行卡
  control: 24, // 控件级（对比格/遮罩/小卡）
  pill: 999, // 胶囊（--law-radius-pill）
} as const;

/** 阴影令牌：静态卡片零阴影，阴影是「浮起」的专属信号——只给真实浮层
 *  （如口诀遮罩盖住内容时）；值同页面 --law-shadow-pop 亮色 */
export const SHADOW = {
  pop: "0 8px 24px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06)",
} as const;

/** 十六进制色 → rgba 字符串：动画透明度都从这里落，不依赖 color-mix；
 *  解析失败时按墨色兜底，保证渲染永不产出非法色值 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return `rgba(29, 29, 31, ${a})`;
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

/** 场景根容器：纯白画布铺底 + 安区内边距（字幕带禁入由 SAFE 兜住） */
export const sceneFrameStyle: CSSProperties = {
  backgroundColor: C.surface,
  paddingLeft: SAFE.left,
  paddingRight: VIDEO.width - SAFE.right,
  paddingTop: SAFE.top,
  paddingBottom: VIDEO.height - SAFE.bottom,
};
