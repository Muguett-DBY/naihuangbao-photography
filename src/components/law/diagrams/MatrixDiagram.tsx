import { motion, useReducedMotion } from "framer-motion";
import type { LawGraphic } from "../../../types/law";

/**
 * 对照矩阵动画：2-4 个概念逐列亮相，对比行随解说帧逐行点亮。
 * balance 只能放两个概念两端对照；三个以上概念的考点（抵押/质押/留置）用矩阵。
 */
export function MatrixDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const reducedMotion = useReducedMotion();
  const matrix = graphic.matrix;
  const columns = matrix?.columns ?? [];
  const rows = matrix?.rows ?? [];
  const visibleRows = Math.max(0, Math.min(active, rows.length));

  const pop = reducedMotion ? { duration: 0 } : { duration: 0.32 };

  return (
    <div className="dia-matrix" aria-live="polite">
      <div className="dia-matrix__grid">
        <div
          className="dia-matrix__row is-head"
          style={{ "--dia-matrix-cols": columns.length + 1 } as React.CSSProperties}
        >
          <div className="dia-matrix__corner" aria-hidden="true">
            对比维度
          </div>
          {columns.map((column, index) => (
            <motion.div
              key={column}
              className="dia-matrix__col-head"
              initial={{ opacity: 0, y: -14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...pop, delay: reducedMotion ? 0 : 0.12 * index }}
            >
              {column}
            </motion.div>
          ))}
        </div>
        {rows.map((row, rowIndex) => {
          const shown = rowIndex < visibleRows;
          return (
            <motion.div
              key={row[0]}
              className={`dia-matrix__row ${shown ? "is-shown" : ""}`}
              style={{ "--dia-matrix-cols": columns.length + 1 } as React.CSSProperties}
              initial={false}
              animate={shown ? { opacity: 1 } : { opacity: 0.12 }}
              transition={pop}
            >
              <span className="dia-matrix__dim">{row[0]}</span>
              {row.slice(1, columns.length + 1).map((cell, cellIndex) => (
                <span key={cellIndex} className="dia-matrix__cell">
                  {cell}
                </span>
              ))}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
