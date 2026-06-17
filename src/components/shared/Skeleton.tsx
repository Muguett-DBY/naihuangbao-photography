/**
 * Skeleton loading component for content placeholders.
 * Shows animated shimmer effect while content is loading.
 *
 * Usage:
 *   <Skeleton lines={3} />
 *   <Skeleton type="image" height={200} />
 *   <Skeleton type="card" />
 */
type SkeletonProps = {
  lines?: number;
  type?: "text" | "image" | "card" | "avatar";
  height?: number;
  className?: string;
};

export function Skeleton({ lines = 1, type = "text", height, className = "" }: SkeletonProps) {
  if (type === "image") {
    return (
      <div
        className={`skeleton skeleton-image ${className}`}
        style={{ height: height || 200 }}
        aria-hidden="true"
      />
    );
  }

  if (type === "card") {
    return (
      <div className={`skeleton skeleton-card ${className}`} aria-hidden="true">
        <div className="skeleton-image" style={{ height: 160 }} />
        <div className="skeleton-text" style={{ width: "60%", height: 16, marginTop: 12 }} />
        <div className="skeleton-text" style={{ width: "80%", height: 14, marginTop: 8 }} />
        <div className="skeleton-text" style={{ width: "40%", height: 14, marginTop: 8 }} />
      </div>
    );
  }

  if (type === "avatar") {
    return (
      <div
        className={`skeleton skeleton-avatar ${className}`}
        style={{ width: height || 48, height: height || 48 }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`skeleton skeleton-text-group ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-text"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
            height: 14,
          }}
        />
      ))}
    </div>
  );
}
