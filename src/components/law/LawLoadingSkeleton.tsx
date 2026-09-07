import "../../styles/law-skeleton.css";

/**
 * law 模块统一加载骨架：数据分块加载期间的占位结构。
 * 动画仅在 prefers-reduced-motion: no-preference 下启用（law-skeleton.css），
 * 文案保留给读屏器（sr-only），视觉上是结构化骨架而不是一行字。
 */
export function LawLoadingSkeleton({ label, variant = "page" }: { label: string; variant?: "page" | "lesson" }) {
  return (
    <div
      className={`law-skeleton law-skeleton--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="law-sr-only">{label}</span>
      {variant === "lesson" ? (
        <div className="law-skeleton__player">
          <div className="law-skeleton__chip" />
          <div className="law-skeleton__stage law-skeleton__shine" />
          <div className="law-skeleton__line law-skeleton__shine" />
          <div className="law-skeleton__line law-skeleton__shine law-skeleton__line--short" />
          <div className="law-skeleton__row">
            <div className="law-skeleton__btn law-skeleton__shine" />
            <div className="law-skeleton__btn law-skeleton__btn--primary law-skeleton__shine" />
          </div>
        </div>
      ) : (
        <div className="law-skeleton__page">
          <div className="law-skeleton__hero law-skeleton__shine" />
          <div className="law-skeleton__search law-skeleton__shine" />
          <div className="law-skeleton__cards">
            {[0, 1, 2].map((row) => (
              <div key={row} className="law-skeleton__card law-skeleton__shine" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
