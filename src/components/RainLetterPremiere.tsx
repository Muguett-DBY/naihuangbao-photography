import "../styles/rain-letter.css";
import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, Sparkles } from "lucide-react";
import { rainLetterFrames } from "../data/rain-letter";
import { ImageWithFallback } from "./ImageWithFallback";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function writeProgress(root: HTMLElement, progress: number) {
  const first = clamp(1 - progress * 2.45);
  const middle = clamp(1 - Math.abs(progress - 0.5) * 3.35);
  const last = clamp((progress - 0.54) * 2.25);

  root.style.setProperty("--rain-letter-progress", progress.toFixed(4));
  root.style.setProperty("--rain-frame-1", first.toFixed(4));
  root.style.setProperty("--rain-frame-2", middle.toFixed(4));
  root.style.setProperty("--rain-frame-3", last.toFixed(4));
  root.dataset.rainPhase = progress < 0.32 ? "garden" : progress < 0.7 ? "window" : "lane";
}

function useRainLetterMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame: number | null = null;
    let visible = true;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      frame = null;
      if (reducedMotion.matches) {
        writeProgress(root, 0.52);
        root.style.setProperty("--rain-pointer-x", "0px");
        root.style.setProperty("--rain-pointer-y", "0px");
        return;
      }
      if (!visible) return;

      const bounds = root.getBoundingClientRect();
      const scrollable = Math.max(1, bounds.height - window.innerHeight);
      writeProgress(root, clamp(-bounds.top / scrollable));
      root.style.setProperty("--rain-pointer-x", `${pointerX.toFixed(2)}px`);
      root.style.setProperty("--rain-pointer-y", `${pointerY.toFixed(2)}px`);
    };

    const requestUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const bounds = root.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 18;
      pointerY = ((event.clientY - bounds.top) / Math.max(1, window.innerHeight) - 0.5) * 12;
      requestUpdate();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) requestUpdate();
    }, { rootMargin: "20% 0px", threshold: 0.01 });

    observer.observe(root);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    root.addEventListener("pointermove", handlePointerMove, { passive: true });
    reducedMotion.addEventListener("change", requestUpdate);
    requestUpdate();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      root.removeEventListener("pointermove", handlePointerMove);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, [rootRef]);
}

export function RainLetterPremiere() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  useRainLetterMotion(rootRef);

  return (
    <section
      ref={rootRef}
      className="rain-letter"
      id="rain-letter"
      data-chapter="01"
      data-rain-phase="garden"
      aria-labelledby="rain-letter-title"
    >
      <div className="rain-letter__sticky">
        <div className="rain-letter__frames">
          {rainLetterFrames.map((item, index) => (
            <figure
              className={`rain-letter__frame rain-letter__frame--${index + 1}`}
              key={item.id}
            >
              <ImageWithFallback
                src={item.imageUrl}
                alt={t(item.altKey)}
                title={t(item.titleKey)}
                tone={index === 2 ? "ink" : "sage"}
                priority={index === 0}
                sizes="100vw"
              />
            </figure>
          ))}
          <div className="rain-letter__wash" aria-hidden="true" />
          <div className="rain-letter__grain" aria-hidden="true" />
        </div>

        <header className="rain-letter__masthead">
          <p><Sparkles size={14} aria-hidden="true" /> {t("rainLetter.eyebrow")}</p>
          <span>{t("rainLetter.disclosure")}</span>
        </header>

        <div className="rain-letter__title-lockup">
          <span aria-hidden="true">NANJING / 2026</span>
          <h2 id="rain-letter-title">{t("rainLetter.title")}</h2>
          <p>{t("rainLetter.intro")}</p>
        </div>

        <div className="rain-letter__notes">
          {rainLetterFrames.map((item, index) => (
            <article className={`rain-letter__note rain-letter__note--${index + 1}`} key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{t(item.titleKey)}</h3>
                <p>{t(item.copyKey)}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="rain-letter__progress" aria-hidden="true">
          <span>01</span>
          <i />
          <span>03</span>
        </div>
        <p className="rain-letter__scroll-cue"><ArrowDown size={15} aria-hidden="true" /> {t("rainLetter.scroll")}</p>
      </div>
    </section>
  );
}
