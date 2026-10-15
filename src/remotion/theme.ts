import type { CSSProperties } from "react";
import type { ClassroomSceneType } from "../lib/law-classroom";
import type { LawSubjectId } from "../types/law";

/**
 * 法硕课堂视频 · 设计令牌（可爱化：与第一波页面层 law-academy 令牌对齐）
 * 模式沿用视频引擎测试 theme.ts：有限调色板（写死的色值，全片只用这些）
 * + 字体栈 + 安全区 + 帧精确动画时序。
 * 奶油三层/奶黄点缀逐字取自 src/styles/law-academy.css 头部变量区
 * （--law-cream-bg / --law-cream-surface / --law-cream-raised / --law-custard）；
 * 五科粉彩 + ink 与 src/pages/LawAcademyPage.tsx 的 SUBJECT_TINT 逐字对应
 * （页面层双底实测 ink ≥5.54:1）。
 */

/** 画布规格：1080×1920 竖版 · 30fps —— 帧精确时序全部以此为基准 */
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** 有限调色板：全片只用这些色值，强调色一律走学科色（SUBJECT_ACCENTS） */
export const C = {
  ink: "#322a28", // 近黑暖墨（正文）
  paper: "#fdfaf5", // 奶油画布底（--law-cream-bg，可爱令牌）
  surface: "#fffefb", // 卡片面（--law-cream-surface）
  raised: "#ffffff", // 浮层/贴纸面（--law-cream-raised）
  gray: "#6b5f5a", // 次级文字（对齐页面层 --cls-muted 同值；奶油底 5.92:1——旧值 #8a7e76 仅 3.79:1，小字号不达 AA）
  line: "#ded7d2", // 发丝线（奶油底上依旧成立）
  custard: "#f0c264", // 奶黄点缀（--law-custard；奶油底上 1.60:1——仅装饰，禁作文字/交互色）
  ok: "#5c8264", // 正确/成立
  err: "#b1544e", // 错误/注意（alert 场覆盖色；奶油底上 4.7:1）
} as const;

/**
 * 学科色 —— 可爱令牌映射：粉彩（pastel，只做底色块/淡晕/描边）+ 强调墨
 * （ink，正文/标题承载色，奶油底与粉彩底双底 ≥5.54:1，对比度红线）。
 * accent/accentSoft 为兼容别名（accent=ink、accentSoft=pastel）：老调用点
 * （ClassroomPlayer 兜底、MnemonicScene 缺省）不改名即得可爱化——
 * accent 作文字色从中间调换成 ink 后对比只升不降。
 */
export const SUBJECT_ACCENTS: Record<
  LawSubjectId,
  { accent: string; accentSoft: string; pastel: string; ink: string }
> = {
  falixue: { accent: "#44614f", accentSoft: "#dcebe1", pastel: "#dcebe1", ink: "#44614f" }, // 法理学
  xianfa: { accent: "#7a3a34", accentSoft: "#f4e0dc", pastel: "#f4e0dc", ink: "#7a3a34" }, // 宪法学
  zhishixiang: { accent: "#6d5622", accentSoft: "#f2e9d3", pastel: "#f2e9d3", ink: "#6d5622" }, // 法制史
  minfa: { accent: "#41567a", accentSoft: "#dde8f4", pastel: "#dde8f4", ink: "#41567a" }, // 民法
  xingfa: { accent: "#64415e", accentSoft: "#ede1eb", pastel: "#ede1eb", ink: "#64415e" }, // 刑法
};

/**
 * 步骤类型 → 图形化图标与中文标签（SceneChrome 徽标 + 各场景条目前缀共用）。
 * Record 键覆盖 ClassroomSceneType 全部九类，新类型漏配直接编译报错。
 */
export interface StepTypeMeta {
  /** 图形化符号：徽标与条目前缀共用（升级清单：✓/⚠/？由 step-mark 的 StepMark 承接） */
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

/**
 * 字体栈 F 的确定性前提（可爱化后诚实版声明）：
 *
 * 1. 文楷（Naihuangbao WenKai）：本仓库自带 public/fonts/naihuangbao-wenkai-subset.woff2，
 *    由页面层 @font-face 注册（src/styles/base.css:8，--font-note 同栈）。Remotion Player
 *    在浏览器页面内渲染，页面已注册 → 标题直接 font-family 引用即可生效，无需
 *    @remotion/fonts（fonts.md 的 local-font 路线是给 headless `remotion render` 用的，
 *    本仓库无 @remotion/cli，出片走 Player）。已知边界：若未来走 headless 渲染，
 *    文楷不会自动加载，栈内 "Kaiti SC"/"KaiTi"/serif 兜底。
 * 2. 正文统一无衬线（可爱令牌：正文保可读性）：zhSerif 从衬线栈改为与 zhSans 同栈，
 *    与页面层 --law-font-body（var(--font-body)）对齐；字号全部不变（不小于现行值）。
 * 3. Noto Serif SC 系（zhBlack/zhSerifSemi 的兜底段）仍要求目标机器已装，未装时
 *    回退 SimSun/serif——同旧版已知缺陷；文楷已装（仓库自带）时标题优先文楷，
 *    该缺陷对标题不再生效。
 */
export const F = {
  heading: '"Naihuangbao WenKai","Kaiti SC","KaiTi",serif', // 页面 --font-note 同栈（base.css:125）
  zhBlack: '"Naihuangbao WenKai","Noto Serif SC Black","Noto Serif SC",serif', // 大标题：文楷优先
  zhSerifSemi: '"Naihuangbao WenKai","Noto Serif SC SemiBold","Noto Serif SC",serif', // 小标题/强调：文楷优先
  zhSerif: '"Noto Sans SC","Microsoft YaHei",sans-serif', // 正文：无衬线（可爱令牌，与页面 body 对齐）
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

/**
 * spring 预设：统一弹性手感（overshootClamping: false = 保留自然回弹）。
 * 可爱令牌整体调 Q 弹：stiffness 降一档、damping 压出 overshoot
 * （title ζ≈0.57 / bouncy ζ≈0.47，均有过冲节奏；不加持续循环动画——
 * 唯一例外是吉祥物贴纸浮动，见 chrome.tsx 的 useStickerFloat）。
 */
export const SPRING = {
  title: { damping: 12, stiffness: 110, mass: 0.9, overshootClamping: false },
  soft: { damping: 16, stiffness: 100, mass: 1, overshootClamping: false },
  term: { damping: 10, stiffness: 140, mass: 1, overshootClamping: false },
  /** Q 弹入场（可爱新增）：低阻尼轻刚度，ζ≈0.47、峰值 ≈1.18——配合 chrome 的
   *  useQBounceIn 让 y/scale 线性外推出可见的「过头再回正」手感 */
  bouncy: { damping: 9, stiffness: 90, mass: 1, overshootClamping: false },
} as const;

/** 可爱形状令牌（1080 画布比例）：页面层 20px 卡圆角的视觉等价为 28-36px，
 *  胶囊 999（同 --law-radius-pill） */
export const RADIUS = {
  card: 32, // 外卡（页面 --law-radius-card 20px 的画布等价，取 28-36 中值）
  inner: 24, // 内嵌块
  bubble: 20, // 气泡/术语胶囊的非全圆形态
  pill: 999, // 胶囊（--law-radius-pill）
} as const;

/** 软阴影令牌（可爱令牌：y 偏移 6-10、模糊 18-28、低透明度；
 *  墨色同页面 --law-shadow-* 的 rgba(75,59,55,…)） */
export const SHADOW = {
  soft: "0 6px 18px rgba(75, 59, 55, 0.06), 0 10px 28px rgba(75, 59, 55, 0.05)",
  lift: "0 8px 20px rgba(75, 59, 55, 0.08), 0 12px 28px rgba(75, 59, 55, 0.06)",
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
