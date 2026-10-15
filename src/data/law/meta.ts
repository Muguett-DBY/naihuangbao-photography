import type { LawSubjectId, LawSubjectMeta } from "../../types/law";

/**
 * 学科强调色（Apple 化）：accent = 五科锚点 token 引用（亮暗由 law-academy.css
 * 同槽变体自动翻转）；accentSoft = 灰阶内嵌底。旧粉彩中间调（#6f9277/#b1544e/
 * #a9853f/#5f7fae/#96608f + 奶油 soft）已退役——这些值只进 CSS 自定义属性，
 * 用 var() 字符串即可在暗色下自动翻转。
 */
const ANCHOR: Record<string, { accent: string; accentSoft: string }> = {
  falixue: { accent: "var(--law-a-green, #1f7a3d)", accentSoft: "var(--law-sunken, #f2f2f7)" },
  xianfa: { accent: "var(--law-a-indigo, #5856d6)", accentSoft: "var(--law-sunken, #f2f2f7)" },
  zhishixiang: { accent: "var(--law-a-bronze, #c93400)", accentSoft: "var(--law-sunken, #f2f2f7)" },
  minfa: { accent: "var(--law-a-teal, #0f7b83)", accentSoft: "var(--law-sunken, #f2f2f7)" },
  xingfa: { accent: "var(--law-a-purple, #8944ab)", accentSoft: "var(--law-sunken, #f2f2f7)" },
};

export const LAW_SUBJECTS: LawSubjectMeta[] = [
  {
    id: "falixue",
    name: "法理学",
    fullName: "法理学背诵一本通",
    emoji: "⚖️",
    short: "法的原理与体系",
    accent: ANCHOR.falixue.accent,
    accentSoft: ANCHOR.falixue.accentSoft,
  },
  {
    id: "xianfa",
    name: "宪法学",
    fullName: "宪法学背诵一本通",
    emoji: "🏛️",
    short: "国家制度与公民权利",
    accent: ANCHOR.xianfa.accent,
    accentSoft: ANCHOR.xianfa.accentSoft,
  },
  {
    id: "zhishixiang",
    name: "法制史",
    fullName: "法制史背诵一本通",
    emoji: "📜",
    short: "千年法制变迁",
    accent: ANCHOR.zhishixiang.accent,
    accentSoft: ANCHOR.zhishixiang.accentSoft,
  },
  {
    id: "minfa",
    name: "民法",
    fullName: "民法背诵一本通",
    emoji: "🏠",
    short: "民事生活的基本法",
    accent: ANCHOR.minfa.accent,
    accentSoft: ANCHOR.minfa.accentSoft,
  },
  {
    id: "xingfa",
    name: "刑法",
    fullName: "刑法背诵一本通",
    emoji: "🛡️",
    short: "犯罪与刑罚",
    accent: ANCHOR.xingfa.accent,
    accentSoft: ANCHOR.xingfa.accentSoft,
  },
];

export const LAW_SUBJECT_MAP: Record<LawSubjectId, LawSubjectMeta> = Object.fromEntries(
  LAW_SUBJECTS.map((subject) => [subject.id, subject]),
) as Record<LawSubjectId, LawSubjectMeta>;
