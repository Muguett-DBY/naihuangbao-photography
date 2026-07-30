import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  conceptPremiereMotionFrames,
  conceptPremiereOpeningFrame,
} from "../data/concept-premiere";
import { ImageWithFallback } from "./ImageWithFallback";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function applyPremiereFrame(root: HTMLDivElement, progress: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  const frameEntrance = clamp((progress - 0.05) / 0.3);
  const frameExit = clamp((progress - 0.72) / 0.28);
  const realReveal = clamp((progress - 0.48) / 0.44);
  const openingExit = clamp(progress / 0.74);
  const frameShift = Math.round((1 - frameEntrance) * 42);

  host.style.setProperty("--premiere-progress", progress.toFixed(4));
  host.style.setProperty("--premiere-opening-opacity", (1 - openingExit).toFixed(4));
  host.style.setProperty("--premiere-opening-scale", (1.04 + progress * 0.045).toFixed(4));
  host.style.setProperty("--premiere-frame-opacity", (frameEntrance * (1 - frameExit)).toFixed(4));
  host.style.setProperty("--premiere-frame-shift", `${frameShift}px`);
  host.style.setProperty("--premiere-frame-upshift", `${Math.round(frameShift * -0.72)}px`);
  host.style.setProperty("--premiere-frame-soft-lift", `${Math.round(frameShift * -0.4)}px`);
  host.style.setProperty("--premiere-real-opacity", (0.14 + realReveal * 0.86).toFixed(4));
  host.style.setProperty("--premiere-veil-opacity", (0.48 * (1 - realReveal)).toFixed(4));
  root.dataset.premierePhase = progress < 0.16 ? "opening" : progress < 0.72 ? "unfolding" : "reveal";
}

function usePremiereScroll(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersectsViewport = true;
    let frame: number | null = null;

    const applyStaticFrame = () => {
      root.dataset.premiereMotion = "reduced";
      applyPremiereFrame(root, 0);
      const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
      host.style.setProperty("--premiere-real-opacity", "1");
      host.style.setProperty("--premiere-veil-opacity", "0");
    };
    const update = () => {
      frame = null;
      if (motionQuery.matches) {
        applyStaticFrame();
        return;
      }
      if (!intersectsViewport) return;

      const bounds = root.getBoundingClientRect();
      const progress = clamp(-bounds.top / Math.max(1, bounds.height * 0.78));
      root.dataset.premiereMotion = "full";
      applyPremiereFrame(root, progress);
    };
    const requestUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };
    const handleMotionChange = () => {
      if (motionQuery.matches) applyStaticFrame();
      else requestUpdate();
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (!entry) return;
        intersectsViewport = entry.isIntersecting;
        if (intersectsViewport) requestUpdate();
      }, { threshold: 0.01 });

    observer?.observe(root);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);
    handleMotionChange();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [rootRef]);
}

export function CinematicPremiere() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  usePremiereScroll(rootRef);

  return (
    <div
      ref={rootRef}
      className="cinematic-premiere"
      data-premiere-motion="full"
      data-premiere-phase="opening"
      aria-hidden="true"
    >
      <div className="cinematic-premiere__veil" />
      <div className="cinematic-premiere__opening">
        <ImageWithFallback
          src={conceptPremiereOpeningFrame.imageUrl}
          alt=""
          title={t("premiere.assetTitle")}
          tone="cream"
          priority
          sizes="100vw"
        />
      </div>
      <div className="cinematic-premiere__frame-stack">
        {conceptPremiereMotionFrames.map((frame) => (
          <div
            className={`cinematic-premiere__frame cinematic-premiere__frame--${frame.id}`}
            data-premiere-frame={frame.id}
            key={frame.id}
          >
            <ImageWithFallback
              src={frame.imageUrl}
              alt=""
              title={t(frame.altKey)}
              tone={frame.kind === "detail" ? "ink" : "cream"}
              sizes="(max-width: 980px) 42vw, 24vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
