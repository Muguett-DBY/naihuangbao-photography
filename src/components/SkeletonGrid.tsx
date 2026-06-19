import "../styles/sections.css";

type SkeletonGridProps = {
  count?: number;
  columns?: number;
  ariaLabel?: string;
};

export function SkeletonGrid({ count = 8, columns = 4, ariaLabel = "Loading" }: SkeletonGridProps) {
  return (
    <div
      className="skeleton-grid"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(120, Math.floor(800 / columns))}px, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-grid-item" key={index}>
          <div className="skeleton-grid-thumb" />
          <div className="skeleton-grid-line" />
        </div>
      ))}
    </div>
  );
}
