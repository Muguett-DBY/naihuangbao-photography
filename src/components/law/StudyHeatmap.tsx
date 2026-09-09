import { useMemo, useState } from "react";
import type { LawProgressMap } from "../../lib/law-progress";
import { heatmapCellLabel, heatmapCounts, heatmapGrid, type HeatmapRange } from "./stats/heatmap";

/**
 * GitHub 风格学习热力图（纯 SVG，无图表库）：
 * - 近 365/90/30 天，每日完成课时数映射 5 级色深；
 * - 悬停/长按格子显示日期与完成数（原生 title，触屏与读屏可用）；
 * - 390px 移动端容器横向滚动，不挤压格子。
 */

const CELL = 12;
const GAP = 3;
const PAD_TOP = 18;
const PAD_LEFT = 30;

const RANGE_OPTIONS: { value: HeatmapRange; label: string }[] = [
  { value: 365, label: "一年" },
  { value: 90, label: "90 天" },
  { value: 30, label: "30 天" },
];

const WEEKDAY_LABELS: { row: number; label: string }[] = [
  { row: 0, label: "一" },
  { row: 2, label: "三" },
  { row: 4, label: "五" },
];

export function StudyHeatmap({ progress, now }: { progress: LawProgressMap; now: number }) {
  const [range, setRange] = useState<HeatmapRange>(365);
  const series = useMemo(() => heatmapCounts(progress, range, now), [progress, range, now]);
  const grid = useMemo(() => heatmapGrid(series), [series]);
  const total = series.reduce((sum, day) => sum + day.count, 0);
  const activeDays = series.filter((day) => day.count > 0).length;
  const width = PAD_LEFT + grid.columns * (CELL + GAP);
  const height = PAD_TOP + 7 * (CELL + GAP);

  return (
    <div className="law-heat">
      <div className="law-heat__toolbar">
        <p className="law-heat__summary" aria-live="polite">
          近 {range === 365 ? "一年" : `${range} 天`}完成 <b>{total}</b> 课时 · 学习 <b>{activeDays}</b> 天
        </p>
        <div className="law-heat__ranges" role="group" aria-label="热力图时间范围">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`law-heat__range ${range === option.value ? "is-current" : ""}`}
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="law-heat__scroll">
        <svg
          className="law-heat__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`近 ${range} 天学习热力图：共完成 ${total} 课时，学习 ${activeDays} 天`}
        >
          {grid.monthLabels.map((entry) => (
            <text
              key={`${entry.label}-${entry.column}`}
              x={PAD_LEFT + entry.column * (CELL + GAP)}
              y={12}
              className="law-heat__month"
            >
              {entry.label}
            </text>
          ))}
          {WEEKDAY_LABELS.map((entry) => (
            <text
              key={entry.label}
              x={PAD_LEFT - 8}
              y={PAD_TOP + entry.row * (CELL + GAP) + CELL - 2}
              className="law-heat__weekday"
              textAnchor="end"
            >
              {entry.label}
            </text>
          ))}
          {grid.cells.map((cell) => (
            <rect
              key={cell.dayStart}
              x={PAD_LEFT + cell.column * (CELL + GAP)}
              y={PAD_TOP + cell.row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2.5}
              className={`law-heat__cell law-heat__cell--l${cell.level} ${cell.dayStart === series[series.length - 1]?.dayStart ? "is-today" : ""}`}
            >
              <title>{heatmapCellLabel(cell.dayStart, cell.count)}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="law-heat__legend" aria-hidden="true">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`law-heat__cell law-heat__cell--l${level}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
