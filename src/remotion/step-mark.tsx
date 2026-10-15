import type { CSSProperties, FC } from "react";
import { F, SPRING, withAlpha } from "./theme";
import { strokeDashStyle, useBounceIn, useStamp, useStrokeProgress } from "./chrome";

/**
 * StepMark — list/checklist/alert/quiz 条目前的图形化符号（✓ 描边生长 / ⚠ /
 * ？徽章，替代纯数字圆点）。从 chrome.tsx 拆出独立模块（守 500 行架构预算），
 * 动效仍全部走 chrome.tsx 的帧驱动 helpers，reduced 时定格终态。
 */
export type StepMarkKind = "checklist" | "alert" | "quiz";

/**
 * 条目前的 SVG 符号（升级清单：checklist ✓ 描边生长 / alert ⚠ / quiz ？徽章，
 * 替代纯数字圆点）。全部走 chrome.tsx 的帧驱动 helpers，reduced 时定格终态。
 */
export const StepMark: FC<{
  kind: StepMarkKind;
  accent: string;
  /** 入场起跳帧（场景局部帧号） */
  enterAt?: number;
  /** 渲染尺寸（正方形边长，px） */
  size?: number;
}> = ({ kind, accent, enterAt = 0, size = 44 }) => {
  const check = useStrokeProgress(enterAt + 6, SPRING.term);
  const alert = useBounceIn(enterAt, { distance: 20, scaleFrom: 0.8 });
  const quiz = useStamp(enterAt, { rotate: 8, scaleFrom: 1.5 });

  const shared: CSSProperties = { flex: "none", width: size, height: size };

  if (kind === "checklist") {
    return (
      <svg viewBox="0 0 34 34" style={shared} aria-hidden="true">
        <rect
          x={3}
          y={3}
          width={28}
          height={28}
          rx={9}
          fill={withAlpha(accent, 0.1)}
          stroke={withAlpha(accent, 0.45)}
          strokeWidth={2.5}
        />
        <path
          d="M10 17.5 L15 22.5 L24.5 11.5"
          fill="none"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          style={strokeDashStyle(check)}
        />
      </svg>
    );
  }

  if (kind === "alert") {
    return (
      <svg
        viewBox="0 0 34 34"
        style={{
          ...shared,
          opacity: alert.opacity,
          transform: `translateY(${alert.y}px) scale(${alert.scale})`,
        }}
        aria-hidden="true"
      >
        <path
          d="M17 4.5 L31.5 29 H2.5 Z"
          fill={withAlpha(accent, 0.12)}
          stroke={accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path
          d="M17 13 V20.5"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={17} cy={25} r={1.9} fill={accent} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 34 34"
      style={{
        ...shared,
        opacity: quiz.opacity,
        transform: `scale(${quiz.scale}) rotate(${quiz.rotate}deg)`,
      }}
      aria-hidden="true"
    >
      <circle
        cx={17}
        cy={17}
        r={14}
        fill={withAlpha(accent, 0.14)}
        stroke={withAlpha(accent, 0.45)}
        strokeWidth={2.5}
      />
      <text
        x={17}
        y={23}
        textAnchor="middle"
        fontFamily={F.zhSans}
        fontSize={19}
        fontWeight={700}
        fill={accent}
      >
        ？
      </text>
    </svg>
  );
};
