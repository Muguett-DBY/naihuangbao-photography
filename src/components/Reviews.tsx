import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { reviews as fallbackReviews } from "../data/reviews";

export function Reviews() {
  const { t } = useTranslation();
  const translatedReviews = t("reviews.items", { returnObjects: true }) as typeof fallbackReviews;
  const reviews = Array.isArray(translatedReviews) && translatedReviews.length > 0
    ? translatedReviews
    : fallbackReviews;
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
  }, [reviews.length]);

  useEffect(() => {
    setIndex((value) => Math.min(value, reviews.length - 1));
  }, [reviews.length]);

  return (
    <section id="reviews" className="reviews-shell">
      <h2 className="section-heading">{t("reviews.title")}</h2>
      <div
        className="reviews-track"
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        onTouchStart={stopAuto}
        onTouchEnd={startAuto}
      >
        <button className="reviews-nav reviews-prev" onClick={prev} aria-label={t("reviews.prev")} type="button">
          ‹
        </button>
        <div className="reviews-card" key={index}>
          <p className="reviews-text">"{reviews[index].text}"</p>
          <div className="reviews-meta">
            <span className="reviews-author">— {reviews[index].author}</span>
            <span className="reviews-source">{reviews[index].source}</span>
          </div>
        </div>
        <button className="reviews-nav reviews-next" onClick={next} aria-label={t("reviews.next")} type="button">
          ›
        </button>
      </div>
      <div className="reviews-dots">
        {reviews.map((_, i) => (
          <button
            key={i}
            className={`reviews-dot${i === index ? " is-active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={t("reviews.dot", { index: i + 1 })}
            type="button"
          />
        ))}
      </div>
    </section>
  );
}
