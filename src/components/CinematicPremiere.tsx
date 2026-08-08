import "../styles/optical-garden.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Aperture, Images } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  opticalArchiveById,
} from "../data/optical-archive";
import { ImageWithFallback } from "./ImageWithFallback";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const premiereScenes = [
  { ...opticalArchiveById["garden-hero"], labelKey: "opticalArchive.frames.garden" },
  { ...opticalArchiveById["rain-corridor"], labelKey: "opticalArchive.frames.corridor" },
  { ...opticalArchiveById["lens-stilllife"], labelKey: "opticalArchive.frames.stilllife" },
  { ...opticalArchiveById["paper-ripple"], labelKey: "opticalArchive.frames.paper" },
  { ...opticalArchiveById["moon-gate-night"], labelKey: "opticalArchive.frames.night" },
] as const;

type PremiereView = "concept" | "portfolio";

function applyPremiereProgress(root: HTMLDivElement, progress: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  host.style.setProperty("--premiere-progress", progress.toFixed(4));
  host.style.setProperty("--premiere-concept-opacity", (1 - progress * 0.68).toFixed(4));
  host.style.setProperty("--premiere-real-opacity", (0.24 + progress * 0.76).toFixed(4));
  host.style.setProperty("--premiere-scroll-shift", `${Math.round(progress * 52)}px`);
  root.dataset.premierePhase = progress < 0.12 ? "opening" : progress < 0.72 ? "unfolding" : "reveal";
}

function applyPremierePointer(root: HTMLDivElement, x: number, y: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  host.style.setProperty("--premiere-pointer-x", `${(x * 13).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-y", `${(y * 10).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-x", `${(-x * 7).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-far-y", `${(-y * 5).toFixed(2)}px`);
  host.style.setProperty("--premiere-pointer-position-x", `${(50 + x * 30).toFixed(2)}%`);
  host.style.setProperty("--premiere-pointer-position-y", `${(50 + y * 30).toFixed(2)}%`);
}

function usePremiereInteraction(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame: number | null = null;
    let intersectsViewport = true;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const applyStaticFrame = () => {
      root.dataset.premiereMotion = "reduced";
      root.dataset.premierePointer = "idle";
      applyPremiereProgress(root, 0);
      applyPremierePointer(root, 0, 0);
      host.style.setProperty("--premiere-concept-opacity", "0.46");
      host.style.setProperty("--premiere-real-opacity", "1");
    };

    const update = () => {
      frame = null;
      if (motionQuery.matches) {
        applyStaticFrame();
        return;
      }
      if (!intersectsViewport) return;

      const bounds = root.getBoundingClientRect();
      const progress = clamp(-bounds.top / Math.max(1, bounds.height * 0.52));
      const deltaX = pointerTargetX - pointerX;
      const deltaY = pointerTargetY - pointerY;
      pointerX += deltaX * 0.14;
      pointerY += deltaY * 0.14;

      root.dataset.premiereMotion = "full";
      applyPremiereProgress(root, progress);
      applyPremierePointer(root, pointerX, pointerY);

      if (Math.abs(deltaX) > 0.002 || Math.abs(deltaY) > 0.002) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const requestUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (motionQuery.matches || !finePointerQuery.matches) return;
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

    const handleMotionChange = () => {
      if (motionQuery.matches) applyStaticFrame();
      else requestUpdate();
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
  const sceneButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedScenes, setLoadedScenes] = useState(() => new Set([0]));
  const [view, setView] = useState<PremiereView>("concept");
  usePremiereInteraction(rootRef);

  const activateScene = useCallback((nextIndex: number) => {
    const normalizedIndex = (nextIndex + premiereScenes.length) % premiereScenes.length;
    setActiveIndex((currentIndex) => {
      const root = rootRef.current;
      if (root) root.dataset.sceneDirection = normalizedIndex >= currentIndex ? "forward" : "backward";
      return normalizedIndex;
    });
    setLoadedScenes((current) => {
      if (current.has(normalizedIndex)) return current;
      const next = new Set(current);
      next.add(normalizedIndex);
      return next;
    });
  }, []);

  const selectView = useCallback((nextView: PremiereView) => {
    setView(nextView);
    const host = rootRef.current?.parentElement;
    if (host instanceof HTMLElement) host.dataset.premiereView = nextView;
  }, []);

  const handleSceneKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = activeIndex + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = activeIndex - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = premiereScenes.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const normalizedIndex = (nextIndex + premiereScenes.length) % premiereScenes.length;
    activateScene(normalizedIndex);
    window.requestAnimationFrame(() => sceneButtonsRef.current[normalizedIndex]?.focus());
  };

  const activeScene = premiereScenes[activeIndex];

  return (
    <div
      ref={rootRef}
      className="cinematic-premiere"
      data-premiere-motion="full"
      data-premiere-phase="opening"
      data-premiere-pointer="idle"
      data-premiere-active="true"
      data-premiere-view={view}
      data-active-scene={activeScene.id}
      data-loaded-scenes={loadedScenes.size}
    >
      <div className="cinematic-premiere__stage" aria-hidden="true">
        {premiereScenes.map((scene, index) => (
          <div
            className={`cinematic-premiere__scene${index === activeIndex ? " is-active" : ""}`}
            data-premiere-scene={scene.id}
            key={scene.id}
          >
            {loadedScenes.has(index) ? (
              <ImageWithFallback
                src={scene.imageUrl}
                alt=""
                title={t(scene.altKey as never)}
                tone="ink"
                priority={index === 0}
                sizes="(max-width: 980px) 100vw, 62vw"
              />
            ) : null}
          </div>
        ))}
        <div className="cinematic-premiere__gate" />
        <div className="cinematic-premiere__optical-lens">
          <ImageWithFallback
            src={activeScene.imageUrl}
            alt=""
            title={t(activeScene.altKey as never)}
            tone="ink"
            sizes="(max-width: 980px) 100vw, 62vw"
          />
          <span className="cinematic-premiere__lens-reticle" />
        </div>
        <div className="cinematic-premiere__registration">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="cinematic-premiere__archive-mark" aria-hidden="true">
        <Aperture size={17} />
        <span>NHB / OPTICAL ARCHIVE</span>
        <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
      </div>

      <div className="cinematic-premiere__mode" role="group" aria-label={t("premiere.reel.modeLabel")}>
        <button
          type="button"
          className={view === "concept" ? "is-active" : undefined}
          aria-pressed={view === "concept"}
          onClick={() => selectView("concept")}
        >
          <Aperture size={15} aria-hidden="true" />
          <span>{t("premiere.reel.conceptMode")}</span>
        </button>
        <button
          type="button"
          className={view === "portfolio" ? "is-active" : undefined}
          aria-pressed={view === "portfolio"}
          onClick={() => selectView("portfolio")}
        >
          <Images size={15} aria-hidden="true" />
          <span>{t("premiere.reel.portfolioMode")}</span>
        </button>
      </div>

      {view === "concept" ? (
        <>
          <div
            className="cinematic-premiere__reel"
            role="group"
            aria-label={t("opticalArchive.sceneLabel")}
            onKeyDown={handleSceneKeys}
          >
            {premiereScenes.map((scene, index) => (
              <button
                ref={(node) => { sceneButtonsRef.current[index] = node; }}
                type="button"
                className={index === activeIndex ? "is-active" : undefined}
                aria-pressed={index === activeIndex}
                aria-label={`${String(index + 1).padStart(2, "0")} ${t(scene.labelKey as never)}`}
                key={scene.id}
                onClick={() => activateScene(index)}
                onFocus={() => activateScene(index)}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") activateScene(index);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{t(scene.labelKey as never)}</strong>
              </button>
            ))}
          </div>

          <div className="cinematic-premiere__readout" aria-live="polite">
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(premiereScenes.length).padStart(2, "0")}</span>
            <strong>{t(activeScene.labelKey as never)}</strong>
          </div>
        </>
      ) : null}
    </div>
  );
}
