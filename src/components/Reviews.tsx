import { useCallback, useEffect, useState, type FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reviews as fallbackReviews } from "../data/reviews";

const ROTATION_INTERVAL_MS = 6000;
const SWIPE_THRESHOLD = 55;

export function Reviews() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const translatedReviews = t("reviews.items", { returnObjects: true }) as typeof fallbackReviews;
  const reviews = Array.isArray(translatedReviews) && translatedReviews.length > 0
    ? translatedReviews
    : fallbackReviews;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const isPaused = isHovering || hasFocusWithin || isPointerActive;

  const next = useCallback(() => {
    setDirection(1);
    setIndex((value) => (value + 1) % reviews.length);
  }, [reviews.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((value) => (value - 1 + reviews.length) % reviews.length);
  }, [reviews.length]);

  const goTo = (nextIndex: number) => {
    setDirection(nextIndex >= index ? 1 : -1);
    setIndex(nextIndex);
  };

  useEffect(() => {
    const syncVisibility = () => setIsDocumentVisible(document.visibilityState === "visible");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (reduceMotion || isPaused || !isDocumentVisible || reviews.length < 2) return;
    const interval = window.setInterval(next, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isDocumentVisible, isPaused, next, reduceMotion, reviews.length]);

  useEffect(() => {
    setIndex((value) => Math.min(value, Math.max(0, reviews.length - 1)));
  }, [reviews.length]);

  useEffect(() => {
    if (!isPointerActive) return;
    const releasePointer = () => setIsPointerActive(false);

    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("blur", releasePointer);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("blur", releasePointer);
    };
  }, [isPointerActive]);

  const handleTrackBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setHasFocusWithin(false);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD) next();
    if (info.offset.x >= SWIPE_THRESHOLD) prev();
  };

  return (
    <section id="reviews" className="reviews-shell" data-motion-group>
      <header className="reviews-heading" data-motion-item>
        <p>04 / {t("reviews.title")}</p>
        <h2>{t("reviews.title")}</h2>
      </header>

      <div className="reviews-stage" data-motion-item>
        <aside className="reviews-folio" aria-hidden="true">
          <strong>{String(index + 1).padStart(2, "0")}</strong>
          <span>/ {String(reviews.length).padStart(2, "0")}</span>
        </aside>

        <div className="reviews-deck">
          <div
            className="reviews-track"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onPointerDown={() => setIsPointerActive(true)}
            onPointerUp={() => setIsPointerActive(false)}
            onPointerCancel={() => setIsPointerActive(false)}
            onFocusCapture={() => setHasFocusWithin(true)}
            onBlurCapture={handleTrackBlur}
          >
            <button className="reviews-nav reviews-prev" onClick={prev} aria-label={t("reviews.prev")} type="button">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <div className="reviews-card-viewport">
              <AnimatePresence initial={false} mode="wait">
                <motion.article
                  className="reviews-card"
                  key={index}
                  initial={reduceMotion ? false : { opacity: 0, x: direction * 34 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: direction * -34 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  drag={reduceMotion ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.08}
                  onDragEnd={handleDragEnd}
                >
                  <blockquote className="reviews-text">“{reviews[index].text}”</blockquote>
                  <div className="reviews-meta">
                    <span className="reviews-author">{reviews[index].author}</span>
                    <span className="reviews-source">{reviews[index].source}</span>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
            <button className="reviews-nav reviews-next" onClick={next} aria-label={t("reviews.next")} type="button">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="reviews-controls">
            <div className="reviews-dots">
              {reviews.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  className={`reviews-dot${dotIndex === index ? " is-active" : ""}`}
                  onClick={() => goTo(dotIndex)}
                  aria-current={dotIndex === index ? "true" : undefined}
                  aria-label={t("reviews.dot", { index: dotIndex + 1 })}
                  type="button"
                />
              ))}
            </div>
            <div className={`reviews-progress${isPaused || !isDocumentVisible ? " is-paused" : ""}`} aria-hidden="true">
              <span key={index} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
