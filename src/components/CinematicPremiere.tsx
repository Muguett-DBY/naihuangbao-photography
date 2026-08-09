import "../styles/scene-graph-v7.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { premiereSceneGraphs } from "../data/premiere-scene-graphs";
import { ImageWithFallback } from "./ImageWithFallback";
import { PrefetchLink } from "./shared/PrefetchLink";
import { visualAssetTransitionName } from "../lib/view-transition";
import { applySceneNodeStyle, getSceneIndexForProgress } from "../lib/scene-graph";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const premiereSceneGraph = premiereSceneGraphs.dawn;
const premiereScenes = premiereSceneGraph.nodes;

function applyPremiereProgress(root: HTMLDivElement, progress: number) {
  const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
  host.style.setProperty("--premiere-progress", progress.toFixed(4));
  host.style.setProperty("--premiere-scroll-shift", `${Math.round(progress * 24)}px`);
  root.dataset.premierePhase = progress < 0.12 ? "opening" : progress < 0.56 ? "unfolding" : "reveal";
}

function usePremiereScroll(
  rootRef: RefObject<HTMLDivElement | null>,
  sceneCount: number,
  onScrollScene: (index: number) => void,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let intersectsViewport = true;
    let lastScrollScene = 0;

    const update = () => {
      frame = null;
      if (motionQuery.matches) {
        root.dataset.premiereMotion = "reduced";
        root.dataset.premierePhase = "opening";
        applyPremiereProgress(root, 0);
        return;
      }
      if (!intersectsViewport) return;

      const bounds = root.getBoundingClientRect();
      const progress = clamp(-bounds.top / Math.max(1, bounds.height * 0.62));
      root.dataset.premiereMotion = "full";
      applyPremiereProgress(root, progress);

      if (bounds.top < -8) {
        const nextScene = getSceneIndexForProgress(progress, sceneCount);
        if (nextScene !== lastScrollScene) {
          lastScrollScene = nextScene;
          onScrollScene(nextScene);
        }
      }
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const handleMotionChange = () => schedule();
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (!entry) return;
        intersectsViewport = entry.isIntersecting;
        root.dataset.premiereActive = intersectsViewport ? "true" : "false";
        if (intersectsViewport) schedule();
      }, { threshold: 0.01 });

    observer?.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    motionQuery.addEventListener("change", handleMotionChange);
    schedule();

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [onScrollScene, rootRef, sceneCount]);
}

export function CinematicPremiere() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedScenes, setLoadedScenes] = useState(() => new Set([0]));

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
  }, [premiereScenes.length]);

  usePremiereScroll(rootRef, premiereScenes.length, activateScene);

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

  useEffect(() => {
    const root = rootRef.current;
    if (root) applySceneNodeStyle(root, activeScene);
  }, [activeScene]);

  return (
    <div
      ref={rootRef}
      className="cinematic-premiere"
      data-premiere-motion="full"
      data-premiere-phase="opening"
      data-premiere-active="true"
      data-visual-world="dawn"
      data-active-scene={activeScene.id}
      data-active-asset={activeScene.assetId}
      data-loaded-scenes={loadedScenes.size}
      data-scene-graph={premiereSceneGraph.id}
    >
      <div className="cinematic-premiere__stage" aria-hidden="true">
        {premiereScenes.map((scene, index) => (
          <div
            className={`cinematic-premiere__scene${index === activeIndex ? " is-active" : ""}`}
            data-premiere-scene={scene.id}
            data-scene-transition={scene.transition}
            style={{ "--node-depth": scene.depth, "--node-intensity": scene.intensity } as React.CSSProperties}
            key={scene.id}
          >
            {loadedScenes.has(index) ? (
              <ImageWithFallback
                src={scene.imageUrl}
                alt=""
                title={t(scene.altKey as never)}
                tone="ink"
                priority={index === 0}
                sizes="100vw"
                transitionName={index === activeIndex ? visualAssetTransitionName(scene.assetId) : undefined}
              />
            ) : null}
          </div>
        ))}
        <div className="cinematic-premiere__wash" />
      </div>

      <div className="cinematic-premiere__navigator" onKeyDown={handleSceneKeys}>
        <div className="cinematic-premiere__scene-meta" aria-live="polite">
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(premiereScenes.length).padStart(2, "0")}</span>
          <strong>{t(activeScene.labelKey as never)}</strong>
        </div>
        <div className="cinematic-premiere__scene-dots" role="group" aria-label={t("opticalArchive.sceneLabel")}>
          {premiereScenes.map((scene, index) => (
            <button
              ref={(node) => { sceneButtonsRef.current[index] = node; }}
              type="button"
              className={index === activeIndex ? "is-active" : undefined}
              aria-pressed={index === activeIndex}
              aria-label={`${String(index + 1).padStart(2, "0")} ${t(scene.labelKey as never)}`}
              title={t(scene.labelKey as never)}
              tabIndex={index === activeIndex ? 0 : -1}
              key={scene.id}
              onClick={() => activateScene(index)}
            />
          ))}
        </div>
        <PrefetchLink
          className="cinematic-premiere__archive-link"
          to={`/archive?similar=${encodeURIComponent(activeScene.assetId)}`}
          aria-label={`${t("visualWorlds.explore" as never)}: ${t(activeScene.labelKey as never)}`}
          title={t("visualWorlds.explore" as never)}
        >
          <ArrowUpRight size={17} aria-hidden="true" />
        </PrefetchLink>
      </div>
    </div>
  );
}
