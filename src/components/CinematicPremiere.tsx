import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  conceptPremiereMotionFrames,
  conceptPremiereOpeningFrame,
  conceptPremierePrismFrame,
} from "../data/concept-premiere";
import { ImageWithFallback } from "./ImageWithFallback";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function applyPremiereFrame(root: HTMLDivElement, progress: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  const frameEntrance = clamp(progress / 0.24);
  const frameExit = clamp((progress - 0.68) / 0.32);
  const realReveal = clamp((progress - 0.38) / 0.48);
  const openingExit = clamp((progress - 0.04) / 0.68);
  const apertureExit = clamp((progress - 0.58) / 0.42);
  const teaserFade = 1 - clamp(progress / 0.2);
  const frameOpacity = frameEntrance * (1 - frameExit);
  const frameShift = Math.round((1 - frameEntrance) * 38);

  host.style.setProperty("--premiere-progress", progress.toFixed(4));
  host.style.setProperty("--premiere-opening-opacity", (1 - openingExit).toFixed(4));
  host.style.setProperty("--premiere-opening-scale", (1.04 + progress * 0.045).toFixed(4));
  host.style.setProperty("--premiere-aperture-opacity", ((0.58 + frameEntrance * 0.16) * (1 - apertureExit)).toFixed(4));
  host.style.setProperty("--premiere-frame-opacity", frameOpacity.toFixed(4));
  host.style.setProperty("--premiere-ribbon-opacity", Math.max(frameOpacity, teaserFade * 0.48).toFixed(4));
  host.style.setProperty("--premiere-afterimage-opacity", Math.max(frameOpacity, teaserFade * 0.28).toFixed(4));
  host.style.setProperty("--premiere-frame-shift", `${frameShift}px`);
  host.style.setProperty("--premiere-frame-upshift", `${Math.round(frameShift * -0.72)}px`);
  host.style.setProperty("--premiere-frame-soft-lift", `${Math.round(frameShift * -0.4)}px`);
  host.style.setProperty("--premiere-real-opacity", (0.14 + realReveal * 0.86).toFixed(4));
  host.style.setProperty("--premiere-veil-opacity", (0.3 * (1 - realReveal)).toFixed(4));
  root.dataset.premierePhase = progress < 0.12 ? "opening" : progress < 0.7 ? "unfolding" : "reveal";
}

function applyPremierePointer(root: HTMLDivElement, x: number, y: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  host.style.setProperty("--premiere-pointer-x", `${(50 + x * 18).toFixed(2)}%`);
  host.style.setProperty("--premiere-pointer-y", `${(50 + y * 15).toFixed(2)}%`);
  host.style.setProperty("--premiere-opening-x", `${(-x * 7).toFixed(2)}px`);
  host.style.setProperty("--premiere-opening-y", `${(-y * 5).toFixed(2)}px`);
  host.style.setProperty("--premiere-aperture-x", `${(x * 11).toFixed(2)}px`);
  host.style.setProperty("--premiere-aperture-y", `${(y * 8).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-near-x", `${(x * 15).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-near-y", `${(y * 10).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-mid-x", `${(x * 9).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-mid-y", `${(y * 6).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-x", `${(-x * 6).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-y", `${(-y * 4).toFixed(2)}px`);
}

function usePremiereScroll(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersectsViewport = true;
    let frame: number | null = null;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const applyStaticFrame = () => {
      root.dataset.premiereMotion = "reduced";
      root.dataset.premierePointer = "idle";
      applyPremiereFrame(root, 0);
      applyPremierePointer(root, 0, 0);
      const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
      host.style.setProperty("--premiere-real-opacity", "1");
      host.style.setProperty("--premiere-veil-opacity", "0");
      host.style.setProperty("--premiere-aperture-opacity", "0");
    };
    const update = () => {
      frame = null;
      if (motionQuery.matches) {
        applyStaticFrame();
        return;
      }
      if (!intersectsViewport) return;

      const bounds = root.getBoundingClientRect();
      const progress = clamp(-bounds.top / Math.max(1, bounds.height * 0.42));
      const pointerDeltaX = pointerTargetX - pointerX;
      const pointerDeltaY = pointerTargetY - pointerY;
      pointerX += pointerDeltaX * 0.14;
      pointerY += pointerDeltaY * 0.14;
      root.dataset.premiereMotion = "full";
      applyPremiereFrame(root, progress);
      applyPremierePointer(root, pointerX, pointerY);

      if (Math.abs(pointerDeltaX) > 0.002 || Math.abs(pointerDeltaY) > 0.002) {
        frame = window.requestAnimationFrame(update);
      }
    };
    const requestUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };
    const handleMotionChange = () => {
      if (motionQuery.matches) applyStaticFrame();
      else requestUpdate();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (motionQuery.matches || event.pointerType === "touch") return;
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      pointerTargetX = clamp((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointerTargetY = clamp((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      root.dataset.premierePointer = "active";
      requestUpdate();
    };
    const handlePointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
      root.dataset.premierePointer = "idle";
      requestUpdate();
    };
    const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (!entry) return;
        intersectsViewport = entry.isIntersecting;
        root.dataset.premiereActive = intersectsViewport ? "true" : "false";
        if (intersectsViewport) requestUpdate();
      }, { threshold: 0.01 });

    observer?.observe(root);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    host.addEventListener("pointermove", handlePointerMove, { passive: true });
    host.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);
    handleMotionChange();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", handlePointerLeave);
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
      data-premiere-pointer="idle"
      data-premiere-active="true"
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
      <div className="cinematic-premiere__aperture" data-premiere-aperture>
        <ImageWithFallback
          src={conceptPremierePrismFrame.imageUrl}
          alt=""
          title={t(conceptPremierePrismFrame.altKey)}
          tone="cream"
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
