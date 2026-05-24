import { useCallback, useEffect, useRef, useState, type WheelEvent } from "react";
import { galleryItems } from "../data/gallery";

export function HorizontalGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pageIdx, setPageIdx] = useState(0);

  const onWheel = useCallback((e: WheelEvent) => {
    const track = trackRef.current;
    if (!track) return;
    if (track.scrollWidth > track.clientWidth) {
      track.scrollLeft += e.deltaY;
    }
  }, []);

  // Sync dot active state with scroll position
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const pageW = track.clientWidth;
      const idx = Math.round(track.scrollLeft / pageW);
      setPageIdx(Math.min(idx, 2));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

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
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`horiz-dot${i === pageIdx ? " is-active" : ""}`}
            onClick={() => {
              const track = trackRef.current;
              if (track) {
                track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
