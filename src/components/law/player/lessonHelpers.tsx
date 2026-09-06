import type { CSSProperties } from "react";

/** 从 LessonPlayer 抽出的纯展示辅助：步骤指引/类型标签/面包屑清洗/庆祝彩带 */

/** 各步骤类型的待完成指引：禁用态按钮告诉用户"具体还要做什么"而不是含糊的"小任务" */
export const KIND_PENDING_HINT: Record<string, string> = {
  definition: "先解锁上面的关键词哦",
  list: "把上面的条目都点一遍",
  compare: "把每行对比都翻开看看",
  condition: "把成立要件都点亮",
  timeline: "把时间线的节点都走到",
  exception: "去抓住那个「但是」",
  flow: "点「下一步」把流程走完",
  mnemonic: "把口诀的字都翻出来",
};

export function kindLabel(kind: string): string {
  switch (kind) {
    case "definition":
      return "📖 定义";
    case "list":
      return "🗂️ 列举";
    case "compare":
      return "⚖️ 对比";
    case "mnemonic":
      return "🧠 口诀";
    case "timeline":
      return "🕰️ 时间线";
    case "condition":
      return "🔑 要件";
    case "exception":
      return "⚠️ 例外";
    case "flow":
      return "🔗 流程";
    default:
      return "📝 细读";
  }
}

/** 清除页眉残留符号，让面包屑可读（空段与相邻重复段剔除，避免"专题二 /"悬空） */
export function cleanBreadcrumb(crumbs: string[]): string[] {
  // 书页"分则/犯罪论"焊接产生的确定性脏章名，展示前映射修正
  const DIRTY_NAMES: Record<string, string> = {
    分犯罪论: "犯罪论",
  };
  const cleaned = crumbs
    .map((text) => {
      const stripped = text
        .replace(/[○◎●◆・•·✦☆]/g, "")
        .replace(/^\s*(第[一二三四五六七八九十百零0-9]+[编部分章篇卷]?)+[·、]?\s*/, "")
        .trim();
      return DIRTY_NAMES[stripped] ?? stripped;
    })
    .filter((text) => text.length > 0);
  return cleaned.filter((text, index) => index === 0 || text !== cleaned[index - 1]);
}

/** 通过时的庆祝彩带：一次性的纯视觉爆发，不挡交互 */
export function CelebrateBurst() {
  const bits = ["🎉", "✨", "⭐", "🎊", "✨", "💛", "🎉", "⭐"];
  return (
    <div className="law-celebrate" aria-hidden="true">
      {bits.map((bit, index) => {
        const angle = (index / bits.length) * Math.PI * 2;
        const style = {
          "--dx": `${Math.cos(angle) * (70 + (index % 3) * 26)}px`,
          "--dy": `${Math.sin(angle) * (52 + (index % 4) * 18)}px`,
          "--rot": `${index % 2 === 0 ? 220 : -180}deg`,
          animationDelay: `${index * 0.05}s`,
        } as CSSProperties;
        return (
          <span key={index} style={style}>
            {bit}
          </span>
        );
      })}
    </div>
  );
}
