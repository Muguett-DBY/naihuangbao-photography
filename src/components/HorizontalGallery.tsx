import { useRef, type WheelEvent } from "react";
import { galleryItems } from "../data/gallery";

export function HorizontalGallery() {
  const trackRef = useRef<HTMLDivElement>(null);

  const onWheel = (e: WheelEvent) => {
    const track = trackRef.current;
    if (!track) return;
    // Only intercept when horizontal scroll is possible
    if (track.scrollWidth > track.clientWidth) {
      track.scrollLeft += e.deltaY;
    }
  };

  const items = [...galleryItems, ...galleryItems, ...galleryItems].slice(0, 12);

  return (
    <section className="horiz-gallery-compact" onWheel={onWheel}>
      <div className="horiz-gallery-compact-header">
        <span className="horiz-gallery-eyebrow">精选作品</span>
        <h2>横向滚动探索</h2>
        <p className="horiz-gallery-hint">
          <span className="horiz-scroll-icon">↔</span>
          滚轮横向滚动 · 或直接往下翻
        </p>
      </div>
      <div ref={trackRef} className="horiz-gallery-compact-track">
        {items.map((item, i) => (
          <div key={`${item.id}-${i}`} className="horiz-gallery-compact-card">
            <img
              src={item.imageUrl}
              alt={item.alt}
              loading="lazy"
              className="horiz-gallery-compact-img"
              width={400}
              height={533}
            />
            <div className="horiz-gallery-compact-overlay">
              <strong>{item.title}</strong>
              <span>{item.style} · {item.location}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Scroll hint dots */}
      <div className="horiz-gallery-scroll-hint">
        <span className="horiz-dot" />
        <span className="horiz-dot is-active" />
        <span className="horiz-dot" />
      </div>
    </section>
  );
}
