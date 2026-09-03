import type { LawSubjectId, LawSubjectMeta } from "../../types/law";

export const LAW_SUBJECTS: LawSubjectMeta[] = [
  {
    id: "falixue",
    name: "法理学",
    fullName: "法理学背诵一本通",
    emoji: "⚖️",
    short: "法的原理与体系",
    accent: "#6f9277",
    accentSoft: "#e7efe7",
  },
  {
    id: "xianfa",
    name: "宪法学",
    fullName: "宪法学背诵一本通",
    emoji: "🏛️",
    short: "国家制度与公民权利",
    accent: "#b1544e",
    accentSoft: "#f6e5e2",
  },
  {
    id: "zhishixiang",
    name: "法制史",
    fullName: "法制史背诵一本通",
    emoji: "📜",
    short: "千年法制变迁",
    accent: "#a9853f",
    accentSoft: "#f3ecd9",
  },
  {
    id: "minfa",
    name: "民法",
    fullName: "民法背诵一本通",
    emoji: "🏠",
    short: "民事生活的基本法",
    accent: "#5f7fae",
    accentSoft: "#e6ecf6",
  },
  {
    id: "xingfa",
    name: "刑法",
    fullName: "刑法背诵一本通",
    emoji: "🛡️",
    short: "犯罪与刑罚",
    accent: "#96608f",
    accentSoft: "#efe6ee",
  },
];

export const LAW_SUBJECT_MAP: Record<LawSubjectId, LawSubjectMeta> = Object.fromEntries(
  LAW_SUBJECTS.map((subject) => [subject.id, subject]),
) as Record<LawSubjectId, LawSubjectMeta>;
