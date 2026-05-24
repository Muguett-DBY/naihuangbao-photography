import { useRef } from "react";
import { galleryItems } from "../data/gallery";
import { useHorizontalScroll } from "../hooks/useHorizontalScroll";

export function HorizontalGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(sectionRef, trackRef);

  const items = [...galleryItems, ...galleryItems, ...galleryItems].slice(0, 12);

  return (
    <section ref={sectionRef} className="horiz-gallery">
      <div className="horiz-gallery-sticky">
        <div className="horiz-gallery-header">
          <span className="horiz-gallery-eyebrow">精选作品</span>
          <h2>滚动探索</h2>
          <p className="horiz-gallery-hint">↓ 继续向下滚动</p>
        </div>
        <div ref={trackRef} className="horiz-gallery-track">
          {items.map((item, i) => (
            <div key={`${item.id}-${i}`} className="horiz-gallery-card">
              <div className="horiz-gallery-img-wrap">
                <img
                  src={item.imageUrl}
                  alt={item.alt}
                  loading="lazy"
                  className="horiz-gallery-img"
                />
                <div className="horiz-gallery-overlay">
                  <strong>{item.title}</strong>
                  <span>{item.style} · {item.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
