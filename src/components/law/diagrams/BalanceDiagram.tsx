import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { LawGraphic } from "../../../types/law";

/** 天平对比动画：左右两侧加注平台随内容展开，差异行先后点亮 */
export function BalanceDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const balance = graphic.balance;
  const diffs = balance?.diffs ?? [];
  const visibleDiffs = Math.max(0, Math.min(active, diffs.length));
  const tiltClass = (() => {
    const phase = Math.floor(Math.max(active, 0) / 2) % 3;
    return phase === 0 ? "is-tilt-left" : phase === 1 ? "is-tilt-right" : "is-level";
  })();

  return (
    <div className="dia-balance" aria-live="polite">
      <div className="dia-balance__scales">
        <svg viewBox="0 0 340 200" className="dia-balance__svg">
          {/* 支架 */}
          <motion.path
            d="M 170 172 L 170 44"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.path
            d="M 170 44 L 40 62 M 170 44 L 300 62"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
          {/* 横梁（CSS 倾斜类切换） */}
          <g className={`dia-balance__beam ${tiltClass}`}>
            <line x1="40" y1="62" x2="300" y2="62" stroke="currentColor" strokeWidth="3" />
            <line x1="40" y1="62" x2="40" y2="96" stroke="currentColor" strokeWidth="3" />
            <line x1="300" y1="62" x2="300" y2="96" stroke="currentColor" strokeWidth="3" />
            <line x1="170" y1="44" x2="170" y2="82" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="170" cy="84" r="6" fill="currentColor" />
          </g>
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: active >= 1 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <text x="66" y="132" textAnchor="middle" fontSize="14" fontWeight="900" fill="var(--law-accent, #b1544e)">
              {balance?.left ?? "甲"}
            </text>
            <text x="274" y="132" textAnchor="middle" fontSize="14" fontWeight="900" fill="var(--law-accent, #b1544e)">
              {balance?.right ?? "乙"}
            </text>
            <line x1="12" y1="150" x2="328" y2="150" stroke="currentColor" strokeWidth="0" />
          </motion.g>
        </svg>
      </div>

      <div className="dia-balance__rows">
        {diffs.slice(0, 5).map((diff, index) => {
          const shown = index < visibleDiffs;
          return (
            <motion.div
              key={diff[0]}
              className="dia-balance__row"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={shown ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.96 }}
              transition={{ duration: 0.32 }}
            >
              <span className="dia-balance__dim">{diff[0]}</span>
              <span className="dia-balance__side is-a">{diff[1]}</span>
              <span className="dia-balance__side is-b">{diff[2]}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export type { CSSProperties };
