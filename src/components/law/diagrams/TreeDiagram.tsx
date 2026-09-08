import { motion } from "framer-motion";
import { useMemo } from "react";
import type { LawGraphic, GraphicNode } from "../../../types/law";

/** 树形展开动画：根在上居中 → 一级枝干横排展开 → 各分支叶片依次长出 */
export function TreeDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const { root, branches, leaves } = useMemo(() => {
    const root = graphic.nodes.find((node) => node.parent === -1);
    const branches = graphic.nodes.filter((node) => node.parent === 0);
    const leaves: { node: GraphicNode; branchIndex: number }[] = [];
    for (const node of graphic.nodes) {
      const parent = node.parent ?? -2;
      if (parent === -1 || parent === 0) continue;
      const branchIndex = branches.findIndex((branch) => graphic.nodes.indexOf(branch) === parent);
      if (branchIndex >= 0) leaves.push({ node, branchIndex });
    }
    return { root, branches, leaves };
  }, [graphic]);

  // 揭示进度按比例映射：解说步数经常少于"分支+叶子"总数（如 5 步解说对 11 个节点），
  // 若按"每帧亮一个节点"算，最后一帧永远点不亮全部叶子（q083 曾整体缺失 9 片叶子）。
  // 这里把 [0, 帧数-1] 线性映射到 [0, 分支数+叶子数]，保证最后一帧整棵树完整。
  const totalFrames = Math.max(graphic.captions.length, 1);
  const totalUnits = branches.length + leaves.length;
  const unitsRevealed =
    totalUnits === 0 ? 0 : (Math.min(Math.max(active, 0), totalFrames - 1) / Math.max(totalFrames - 1, 1)) * totalUnits;

  const shownBranches = Math.min(branches.length, Math.floor(unitsRevealed));
  const revealedLeaves = Math.max(0, Math.floor(unitsRevealed) - branches.length);

  return (
    <div className="dia-tree">
      {/* 根：外层定位（居中），内层动画 */}
      <div className="dia-tree__root-slot">
        <motion.div
          className="dia-tree__root"
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
        >
          {root?.label}
          <small>{root?.detail}</small>
        </motion.div>
      </div>

      <div className="dia-tree__trunk" aria-hidden="true" />

      <div className="dia-tree__branches">
        {branches.map((branch, index) => {
          const shown = index < shownBranches;
          const childLeaves = leaves
            .filter((leaf) => leaf.branchIndex === index)
            .map((leaf) => leaf.node);
          const leavesBefore = leaves.filter((leaf) => leaf.branchIndex < index).length;
          const leafVisible = shown
            ? Math.max(0, Math.min(revealedLeaves - leavesBefore, childLeaves.length))
            : 0;
          return (
            <div className="dia-tree__branch" key={branch.label}>
              <motion.div
                className="dia-tree__branch-head"
                initial={{ scale: 0, opacity: 0, y: 18 }}
                animate={shown ? { scale: 1, opacity: 1, y: 0 } : { scale: 0, opacity: 0, y: 18 }}
                transition={{ type: "spring", stiffness: 220, damping: 17, delay: 0.08 }}
              >
                <b>{branch.label}</b>
                <small>{branch.detail}</small>
              </motion.div>
              <div className="dia-tree__leaves">
                {childLeaves.slice(0, 6).map((leaf, leafIndex) => {
                  const visible = leafIndex < leafVisible;
                  return (
                    <motion.span
                      key={leaf.label}
                      className="dia-tree__leaf"
                      initial={{ scale: 0, opacity: 0, y: 10 }}
                      animate={visible ? { scale: 1, opacity: 1, y: 0 } : { scale: 0, opacity: 0, y: 10 }}
                      transition={{ type: "spring", stiffness: 240, damping: 17 }}
                      title={leaf.detail}
                    >
                      {leaf.label}
                    </motion.span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dia-tree__footer" aria-hidden="true">
        {branches.length} 大分支 · {leaves.length} 个知识点 ·{" "}
        {graphic.captions[Math.min(active, graphic.captions.length - 1)]?.slice(0, 36)}…
      </div>
    </div>
  );
}
