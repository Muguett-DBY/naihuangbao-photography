import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  conceptPremiereMotionFrames,
  conceptPremiereOpeningFrame,
  conceptPremierePrismFrame,
  conceptPremiereTrailFrames,
} from "../data/concept-premiere";
import { ImageWithFallback } from "./ImageWithFallback";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const clampRange = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const TRAIL_DISTANCE_PX = 68;

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
  host.style.setProperty("--premiere-opening-x", `${(-x * 11).toFixed(2)}px`);
  host.style.setProperty("--premiere-opening-y", `${(-y * 8).toFixed(2)}px`);
  host.style.setProperty("--premiere-aperture-x", `${(x * 22).toFixed(2)}px`);
  host.style.setProperty("--premiere-aperture-y", `${(y * 16).toFixed(2)}px`);
  host.style.setProperty("--premiere-aperture-rotate-x", `${(-y * 3.2).toFixed(2)}deg`);
  host.style.setProperty("--premiere-aperture-rotate-y", `${(x * 4.2).toFixed(2)}deg`);
  host.style.setProperty("--premiere-pointer-near-x", `${(x * 28).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-near-y", `${(y * 19).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-mid-x", `${(x * 16).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-mid-y", `${(y * 11).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-x", `${(-x * 10).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-y", `${(-y * 7).toFixed(2)}px`);
}

function applyPremiereVelocity(root: HTMLDivElement, velocity: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  const energy = clamp(Math.abs(velocity) / 10);
  host.style.setProperty("--premiere-velocity", velocity.toFixed(3));
  host.style.setProperty("--premiere-energy", energy.toFixed(3));
  host.style.setProperty("--premiere-velocity-rotate", `${(velocity * 0.34).toFixed(2)}deg`);
  host.style.setProperty("--premiere-velocity-shift", `${(velocity * 2.6).toFixed(2)}px`);
  host.style.setProperty("--premiere-velocity-lift", `${(velocity * -1.7).toFixed(2)}px`);
  host.style.setProperty("--premiere-velocity-scale", (1 + energy * 0.022).toFixed(4));
  root.dataset.premiereVelocity = energy > 0.08 ? "moving" : "still";
}

function usePremiereScroll(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
    const trailFrames = Array.from(host.querySelectorAll<HTMLElement>("[data-premiere-trail-frame]"));
    const trailAnimations = new Map<HTMLElement, Animation>();
    let intersectsViewport = true;
    let frame: number | null = null;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let velocityTarget = 0;
    let velocity = 0;
    let lastScrollY = window.scrollY;
    let lastFrameTime = performance.now();
    let trailCursor = 0;
    let trailOriginX = 0;
    let trailOriginY = 0;
    let trailHasOrigin = false;
    let trailIdleTimer: number | null = null;

    const stopTrail = (state: "idle" | "disabled" = "idle") => {
      trailAnimations.forEach((animation) => animation.cancel());
      trailAnimations.clear();
      root.dataset.premiereTrail = state;
      if (trailIdleTimer !== null) window.clearTimeout(trailIdleTimer);
      trailIdleTimer = null;
    };

    const showTrailFrame = (x: number, y: number, deltaX: number, deltaY: number) => {
      const element = trailFrames[trailCursor % trailFrames.length];
      if (!element) return;

      const bounds = host.getBoundingClientRect();
      const safeX = clampRange(x, 96, Math.max(96, bounds.width - 96));
      const safeY = clampRange(y, 86, Math.max(86, bounds.height - 86));
      const speed = clampRange(Math.hypot(deltaX, deltaY) / 150, 0.28, 1);
      const driftX = clampRange(deltaX * 0.38, -92, 92);
      const driftY = clampRange(deltaY * 0.28 - 24, -78, 58);
      const rotation = clampRange(deltaX * 0.075, -11, 11) + (trailCursor % 2 === 0 ? -2.4 : 2.4);
      const nextRotation = rotation + clampRange(deltaY * 0.045, -5, 5);

      trailAnimations.get(element)?.cancel();
      element.style.left = `${safeX}px`;
      element.style.top = `${safeY}px`;
      element.style.zIndex = String(10 + trailCursor);
      const animation = element.animate([
        {
          opacity: 0,
          clipPath: "inset(48% 0 48% 0)",
          transform: `translate(-50%, -50%) translate3d(0, 16px, 0) scale(0.68) rotate(${rotation - 4}deg)`,
        },
        {
          opacity: 0.9,
          clipPath: "inset(0 0 0 0)",
          transform: `translate(-50%, -50%) translate3d(0, 0, 0) scale(1) rotate(${rotation}deg)`,
          offset: 0.16,
        },
        {
          opacity: 0.78,
          clipPath: "inset(0 0 0 0)",
          transform: `translate(-50%, -50%) translate3d(${driftX * 0.45}px, ${driftY * 0.45}px, 0) scale(${1.01 + speed * 0.035}) rotate(${(rotation + nextRotation) * 0.5}deg)`,
          offset: 0.58,
        },
        {
          opacity: 0,
          clipPath: "inset(0 0 0 0)",
          transform: `translate(-50%, -50%) translate3d(${driftX}px, ${driftY}px, 0) scale(${1.04 + speed * 0.08}) rotate(${nextRotation}deg)`,
        },
      ], {
        duration: 1_240 + (1 - speed) * 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      });
      trailAnimations.set(element, animation);
      animation.addEventListener("finish", () => {
        if (trailAnimations.get(element) === animation) {
          trailAnimations.delete(element);
          animation.cancel();
        }
      }, { once: true });

      root.dataset.premiereTrail = "active";
      if (trailIdleTimer !== null) window.clearTimeout(trailIdleTimer);
      trailIdleTimer = window.setTimeout(() => {
        root.dataset.premiereTrail = "idle";
        trailIdleTimer = null;
      }, 1_650);
      trailCursor = (trailCursor + 1) % trailFrames.length;
    };

    const applyStaticFrame = () => {
      root.dataset.premiereMotion = "reduced";
      root.dataset.premierePointer = "idle";
      applyPremiereFrame(root, 0);
      applyPremierePointer(root, 0, 0);
      applyPremiereVelocity(root, 0);
      host.style.setProperty("--premiere-real-opacity", "1");
      host.style.setProperty("--premiere-veil-opacity", "0");
      host.style.setProperty("--premiere-aperture-opacity", "0");
      stopTrail("disabled");
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
      const now = performance.now();
      const scrollY = window.scrollY;
      const elapsed = Math.max(16, now - lastFrameTime);
      const scrollDelta = scrollY - lastScrollY;
      if (Math.abs(scrollDelta) > 0.05) {
        velocityTarget = clampRange((scrollDelta / elapsed) * 4.8, -10, 10);
      } else {
        velocityTarget *= 0.82;
      }
      velocity += (velocityTarget - velocity) * 0.2;
      lastScrollY = scrollY;
      lastFrameTime = now;
      const pointerDeltaX = pointerTargetX - pointerX;
      const pointerDeltaY = pointerTargetY - pointerY;
      pointerX += pointerDeltaX * 0.14;
      pointerY += pointerDeltaY * 0.14;
      root.dataset.premiereMotion = "full";
      applyPremiereFrame(root, progress);
      applyPremierePointer(root, pointerX, pointerY);
      applyPremiereVelocity(root, velocity);

      if (
        Math.abs(pointerDeltaX) > 0.002
        || Math.abs(pointerDeltaY) > 0.002
        || Math.abs(velocityTarget) > 0.02
        || Math.abs(velocity) > 0.02
      ) {
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

      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      if (!trailHasOrigin) {
        trailOriginX = bounds.width * 0.5;
        trailOriginY = bounds.height * 0.5;
        trailHasOrigin = true;
      }
      const trailDeltaX = localX - trailOriginX;
      const trailDeltaY = localY - trailOriginY;
      const target = event.target;
      const overControl = target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [role='button']"));
      if (
        finePointerQuery.matches
        && bounds.width >= 981
        && !overControl
        && Math.hypot(trailDeltaX, trailDeltaY) >= TRAIL_DISTANCE_PX
      ) {
        showTrailFrame(localX, localY, trailDeltaX, trailDeltaY);
        trailOriginX = localX;
        trailOriginY = localY;
      }
      requestUpdate();
    };
    const handlePointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
      root.dataset.premierePointer = "idle";
      trailHasOrigin = false;
      requestUpdate();
    };
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
      stopTrail();
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
    <>
      <div
        ref={rootRef}
        className="cinematic-premiere"
        data-premiere-motion="full"
        data-premiere-phase="opening"
        data-premiere-pointer="idle"
        data-premiere-active="true"
        data-premiere-trail="idle"
        data-premiere-velocity="still"
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
      <div className="cinematic-premiere__trail" data-premiere-trail-layer aria-hidden="true">
        {conceptPremiereTrailFrames.map((frame) => (
          <div
            className={`cinematic-premiere__trail-frame cinematic-premiere__trail-frame--${frame.orientation}`}
            data-premiere-trail-frame={frame.id}
            key={frame.id}
          >
            <ImageWithFallback
              src={frame.imageUrl}
              alt=""
              title={t(frame.altKey)}
              tone="ink"
              sizes="(max-width: 1440px) 20vw, 16vw"
            />
          </div>
        ))}
      </div>
    </>
  );
}
