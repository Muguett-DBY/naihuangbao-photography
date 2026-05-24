import { useEffect, useRef, useState } from "react";
import { reviews } from "../data/reviews";

export function Reviews() {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const next = () => setIndex((i) => (i + 1) % reviews.length);
  const prev = () => setIndex((i) => (i - 1 + reviews.length) % reviews.length);

  // Auto-rotate
  const startAuto = () => {
    stopAuto();
    intervalRef.current = setInterval(next, 4000);
  };
  const stopAuto = () => clearInterval(intervalRef.current);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, []);

  return (
    <section id="reviews" className="reviews-shell">
      <h2 className="section-heading">客人怎么说</h2>
      <div
        className="reviews-track"
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        <button className="reviews-nav reviews-prev" onClick={prev} aria-label="上一条评价" type="button">
          ‹
        </button>
        <div className="reviews-card" key={index}>
          <p className="reviews-text">"{reviews[index].text}"</p>
          <div className="reviews-meta">
            <span className="reviews-author">— {reviews[index].author}</span>
            <span className="reviews-source">{reviews[index].source}</span>
          </div>
        </div>
        <button className="reviews-nav reviews-next" onClick={next} aria-label="下一条评价" type="button">
          ›
        </button>
      </div>
      <div className="reviews-dots">
        {reviews.map((_, i) => (
          <button
            key={i}
            className={`reviews-dot${i === index ? " is-active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`第${i + 1}条评价`}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}
