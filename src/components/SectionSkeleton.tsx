interface SectionSkeletonProps {
  lines?: number;
  hasImage?: boolean;
  hasCards?: number;
  className?: string;
}

export function SectionSkeleton({ lines = 4, hasImage = false, hasCards = 0, className = "" }: SectionSkeletonProps) {
  return (
    <div className={`section-shell is-visible ${className}`} style={{ padding: "48px 0" }} aria-hidden="true">
      <div className="skeleton-text-group" style={{ maxWidth: 480, margin: "0 auto 32px", textAlign: "center" }}>
        <div className="skeleton skeleton-text" style={{ width: 80, height: 12, margin: "0 auto" }} />
        <div className="skeleton skeleton-text" style={{ width: 260, height: 28, margin: "8px auto 0" }} />
        <div className="skeleton skeleton-text" style={{ width: 340, height: 14, margin: "12px auto 0", opacity: 0.6 }} />
      </div>

      {hasImage && (
        <div className="skeleton skeleton-image" style={{ height: 200, maxWidth: 600, margin: "0 auto 32px" }} />
      )}

      {hasCards > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(hasCards, 3)}, 1fr)`, gap: 20, maxWidth: 960, margin: "0 auto" }}>
          {Array.from({ length: hasCards }, (_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ minHeight: 180 }}>
              <div className="skeleton skeleton-text" style={{ width: "60%", height: 16, marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: "100%", height: 12, marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: "80%", height: 12, marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: "40%", height: 32, marginTop: 16, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {hasCards === 0 && !hasImage && (
        <div className="skeleton-text-group" style={{ maxWidth: 600, margin: "0 auto" }}>
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className="skeleton skeleton-text"
              style={{ width: `${70 + Math.sin(i * 1.3) * 20}%`, height: 14, marginBottom: i < lines - 1 ? 10 : 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
