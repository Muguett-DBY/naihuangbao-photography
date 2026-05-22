import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type * as Three from "three";
import {
  atmosphereGalleryItems,
  cinematicDetailAssets,
  cinematicGalleryAssets,
  cinematicHeroAssets,
} from "../data/cinematic";
import {
  MAX_CINEMATIC_PHOTOS,
  MAX_CINEMATIC_PLANE_SCALE,
  MIN_CINEMATIC_CAMERA_DISTANCE,
} from "../lib/cinematic-gallery";
import type { PhotoItem } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";

type CinematicGallerySceneProps = {
  photos: PhotoItem[];
  mode: "hero" | "gallery";
  className?: string;
};

type WebGLState = "pending" | "ready" | "fallback";

const sceneCopy = {
  hero: {
    label: "warm studio",
    title: "南京女生写真 / 与情侣约拍",
    body: "柔光、相纸、胶片轨道一起进入奶黄包的影棚世界。",
  },
  gallery: {
    label: "gallery story",
    title: "作品在胶片轨道里慢慢落位",
    body: "真实客片保持小中尺寸相纸呈现，镜头穿梭但不贴脸。",
  },
} as const;

function canCreateWebGLContext() {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2") ??
    canvas.getContext("webgl") ??
    canvas.getContext("experimental-webgl");
  return Boolean(context);
}

function getPlanePosition(index: number, isNarrow: boolean) {
  const laneCount = isNarrow ? 3 : 5;
  const lane = (index % laneCount) - (laneCount - 1) / 2;
  const x = lane * (isNarrow ? 0.58 : 0.76);
  const y = Math.sin(index * 0.86) * (isNarrow ? 0.32 : 0.46) + (isNarrow ? 0.12 : 0);
  const z = -index * (isNarrow ? 0.56 : 0.72) - 1.4;
  return { x, y, z, lane };
}

export function CinematicGalleryScene({
  photos,
  mode,
  className = "",
}: CinematicGallerySceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglState, setWebglState] = useState<WebGLState>("pending");
  const scenePhotos = useMemo(
    () => photos.filter((photo) => Boolean(photo.imageUrl)).slice(0, MAX_CINEMATIC_PHOTOS),
    [photos],
  );
  const fallbackPhotos = scenePhotos.slice(0, mode === "hero" ? 5 : 9);
  const atmosphereCards = atmosphereGalleryItems.slice(0, mode === "hero" ? 3 : 5);
  const detailCards = cinematicDetailAssets.slice(mode === "hero" ? 0 : 3, mode === "hero" ? 3 : 8);
  const assets = mode === "hero" ? cinematicHeroAssets : cinematicGalleryAssets;
  const copy = sceneCopy[mode];

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const mount = mountRef.current;
    if (!root || !stage || !mount || scenePhotos.length === 0) {
      setWebglState("fallback");
      return;
    }

    const rootElement = root;
    const mountElement = mount;
    let disposed = false;
    let frameId: number | null = null;
    let active = false;
    let cleanupScene = () => {};

    async function initScene() {
      try {
        if (!canCreateWebGLContext()) {
          setWebglState("fallback");
          return;
        }

        const [threeModule, gsapModule, scrollTriggerModule] = await Promise.all([
          import("three"),
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);

        if (disposed) return;

        const THREE = threeModule;
        const gsap = gsapModule.gsap;
        const { ScrollTrigger } = scrollTriggerModule;
        gsap.registerPlugin(ScrollTrigger);

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0xfff3df, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.dataset.cinematicCanvas = mode;
        mountElement.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xffeed7, 6.5, 19);
        const camera = new THREE.PerspectiveCamera(mode === "hero" ? 48 : 52, 1, 0.1, 60);
        camera.position.set(0, 0.08, MIN_CINEMATIC_CAMERA_DISTANCE + 2.35);

        const ambient = new THREE.AmbientLight(0xfff3df, 2.15);
        scene.add(ambient);

        const galleryGroup = new THREE.Group();
        scene.add(galleryGroup);

        const frameGeometry = new THREE.PlaneGeometry(1.08, 1.38, 1, 1);
        const photoGeometry = new THREE.PlaneGeometry(0.9, 1.1, 1, 1);
        const frameMaterial = new THREE.MeshBasicMaterial({
          color: 0xfffbf2,
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide,
        });
        const loader = new THREE.TextureLoader();
        const planes: Array<{
          group: Three.Group;
          photoMaterial: Three.MeshBasicMaterial;
          baseRotation: number;
          baseY: number;
          baseZ: number;
        }> = [];
        const palette = [0xffcfb7, 0xfff1d8, 0xe7ead0, 0xffc2ad, 0xf5d7ba];

        scenePhotos.forEach((photo, index) => {
          const photoMaterial = new THREE.MeshBasicMaterial({
            color: palette[index % palette.length],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          });
          const group = new THREE.Group();
          const frame = new THREE.Mesh(frameGeometry, frameMaterial.clone());
          const image = new THREE.Mesh(photoGeometry, photoMaterial);
          image.position.z = 0.012;
          image.position.y = 0.08;
          group.add(frame, image);

          const position = getPlanePosition(index, false);
          const baseRotation = ((index % 7) - 3) * 0.035;
          group.position.set(position.x, position.y, position.z);
          group.rotation.set(0, position.lane * -0.075, baseRotation);
          group.scale.setScalar(MAX_CINEMATIC_PLANE_SCALE * (index % 4 === 0 ? 0.94 : 0.82));
          galleryGroup.add(group);
          planes.push({
            group,
            photoMaterial,
            baseRotation,
            baseY: position.y,
            baseZ: position.z,
          });

          loader.load(
            photo.imageUrl,
            (texture: Three.Texture) => {
              if (disposed) {
                texture.dispose();
                return;
              }
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
              photoMaterial.map = texture;
              photoMaterial.needsUpdate = true;
              renderFrame(performance.now());
            },
            undefined,
            () => {
              photoMaterial.opacity = 0.68;
            },
          );
        });

        const progress = { value: 0 };
        const travelDistance = Math.min(8.4, Math.max(4.2, scenePhotos.length * 0.42));

        function resize() {
          if (disposed) return;
          const width = Math.max(1, mountElement.clientWidth);
          const height = Math.max(1, mountElement.clientHeight);
          const isNarrow = width < 700;
          camera.aspect = width / height;
          camera.fov = isNarrow ? 58 : mode === "hero" ? 48 : 52;
          camera.position.z = MIN_CINEMATIC_CAMERA_DISTANCE + (isNarrow ? 2.8 : 2.35);
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          renderer.setSize(width, height, false);
          galleryGroup.position.x = mode === "hero" ? (isNarrow ? 0.18 : 2.05) : 0;

          planes.forEach(({ group }, index) => {
            const position = getPlanePosition(index, isNarrow);
            group.position.x = position.x;
            group.position.y = position.y;
            group.position.z = position.z;
            group.rotation.y = position.lane * (isNarrow ? -0.04 : -0.075);
            group.scale.setScalar(MAX_CINEMATIC_PLANE_SCALE * (isNarrow ? 0.68 : index % 4 === 0 ? 0.94 : 0.82));
          });
          renderFrame(performance.now());
        }

        function renderFrame(time: number) {
          const p = progress.value;
          const cameraBaseZ = Math.max(
            MIN_CINEMATIC_CAMERA_DISTANCE,
            MIN_CINEMATIC_CAMERA_DISTANCE + 2.35 - p * 0.62,
          );
          const travel = p * travelDistance;
          const shimmer = Math.sin(time * 0.00072) * 0.028;

          camera.position.z = cameraBaseZ;
          camera.position.x = Math.sin(p * Math.PI * 1.45) * (mode === "hero" ? 0.18 : 0.32);
          camera.position.y = 0.12 + Math.cos(p * Math.PI * 1.2) * 0.1;
          camera.rotation.y = Math.sin(p * Math.PI * 1.25) * 0.026;
          camera.rotation.x = -0.012 + Math.cos(p * Math.PI * 1.1) * 0.01;

          galleryGroup.position.z = travel;
          galleryGroup.position.x = mode === "hero" ? galleryGroup.position.x : 0;
          galleryGroup.position.y = (mode === "hero" ? 0.42 : 0.18) + shimmer;
          galleryGroup.rotation.y = (p - 0.5) * (mode === "hero" ? -0.09 : -0.15);

          planes.forEach(({ group, photoMaterial, baseRotation, baseY, baseZ }, index) => {
            const worldZ = baseZ + galleryGroup.position.z;
            const distance = Math.abs(worldZ - camera.position.z);
            photoMaterial.opacity = THREE.MathUtils.clamp(1 - distance / 11, 0.18, 0.92);
            group.position.y = baseY + Math.sin(time * 0.00082 + index) * 0.022;
            group.rotation.z = baseRotation + Math.sin(time * 0.00052 + index * 0.42) * 0.014;
          });

          renderer.render(scene, camera);
        }

        function tick(time: number) {
          frameId = null;
          if (!active || disposed) return;
          renderFrame(time);
          frameId = requestAnimationFrame(tick);
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootElement,
            start: mode === "gallery" ? "top 78%" : "top 70%",
            end: mode === "gallery" ? "bottom 18%" : "bottom top",
            pin: false,
            pinSpacing: false,
            scrub: mode === "gallery" ? 0.9 : 0.55,
            anticipatePin: 0.7,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              progress.value = self.progress;
              rootElement.style.setProperty("--scene-progress", self.progress.toFixed(4));
              renderFrame(performance.now());
            },
          },
        });

        timeline
          .fromTo(
            rootElement.querySelectorAll(".cinematic-float"),
            { yPercent: mode === "gallery" ? 18 : 8, rotate: mode === "gallery" ? -4 : -2 },
            { yPercent: mode === "gallery" ? -18 : -8, rotate: mode === "gallery" ? 4 : 2, stagger: 0.08, ease: "none" },
            0,
          )
          .fromTo(
            rootElement.querySelector(".cinematic-stage-caption"),
            { y: mode === "gallery" ? 28 : 12, opacity: 0.78 },
            { y: mode === "gallery" ? -18 : -8, opacity: 1, ease: "none" },
            0,
          );

        const visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            active = entry.isIntersecting;
            if (active && frameId === null) {
              frameId = requestAnimationFrame(tick);
            }
          },
          { rootMargin: "70% 0px" },
        );
        visibilityObserver.observe(rootElement);

        window.addEventListener("resize", resize, { passive: true });
        resize();
        ScrollTrigger.refresh();
        setWebglState("ready");

        cleanupScene = () => {
          visibilityObserver.disconnect();
          timeline.scrollTrigger?.kill();
          timeline.kill();
          window.removeEventListener("resize", resize);
          if (frameId !== null) {
            cancelAnimationFrame(frameId);
          }
          frameGeometry.dispose();
          photoGeometry.dispose();
          planes.forEach(({ group, photoMaterial }) => {
            photoMaterial.map?.dispose();
            photoMaterial.dispose();
            group.children.forEach((child) => {
              const mesh = child as Three.Mesh<Three.BufferGeometry, Three.Material>;
              if ("material" in mesh) {
                const material = mesh.material;
                if (Array.isArray(material)) {
                  material.forEach((item) => item.dispose());
                } else {
                  material.dispose();
                }
              }
            });
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) {
          setWebglState("fallback");
        }
      }
    }

    // Product decision: this cinematic scene intentionally does not disable its core
    // animation for prefers-reduced-motion, because the current plan prioritizes the
    // full Apple-style scroll effect. WebGL failure still falls back to DOM photos.
    void initScene();

    return () => {
      disposed = true;
      cleanupScene();
    };
  }, [mode, scenePhotos]);

  return (
    <div
      ref={rootRef}
      className={[
        "cinematic-scene",
        `cinematic-scene-${mode}`,
        webglState === "ready" ? "is-webgl-ready" : "",
        className,
      ].filter(Boolean).join(" ")}
      data-webgl-state={webglState}
      style={{ "--scene-progress": 0 } as CSSProperties}
    >
      <div className="cinematic-pin-stage" ref={stageRef}>
        <picture className="cinematic-bg">
          <source media="(max-width: 700px)" srcSet={assets.mobileBackground} />
          <img
            src={assets.background}
            alt=""
            loading={mode === "hero" ? "eager" : "lazy"}
            fetchPriority={mode === "hero" ? "high" : "auto"}
            decoding="async"
            aria-hidden="true"
          />
        </picture>
        <div className="cinematic-webgl" ref={mountRef} aria-hidden="true" />
        <div className="cinematic-light-sweep" aria-hidden="true" />
        <div className="cinematic-film-rail cinematic-film-rail-a" aria-hidden="true" />
        <div className="cinematic-film-rail cinematic-film-rail-b" aria-hidden="true" />
        <div className="cinematic-props" aria-hidden="true">
          {detailCards.map((src, index) => (
            <img
              className="cinematic-float cinematic-detail-card"
              key={src}
              src={src}
              alt=""
              loading={mode === "hero" && index === 0 ? "eager" : "lazy"}
              decoding="async"
              style={{ "--float-index": index } as CSSProperties}
            />
          ))}
        </div>
        <div className="cinematic-atmosphere" aria-hidden="true">
          {atmosphereCards.map((item, index) => (
            <img
              className="cinematic-float cinematic-atmosphere-card"
              key={item.id}
              src={item.imageUrl}
              alt=""
              loading={mode === "hero" && index === 0 ? "eager" : "lazy"}
              decoding="async"
              style={{ "--float-index": index } as CSSProperties}
            />
          ))}
        </div>
        <div className="cinematic-stage-caption">
          <span>{copy.label}</span>
          <strong>{copy.title}</strong>
          <p>{copy.body}</p>
        </div>
        <div className="cinematic-grain" aria-hidden="true" />
        <div className="cinematic-fallback" aria-label="电影胶片作品预览">
          {fallbackPhotos.map((photo, index) => (
            <figure key={photo.id} style={{ "--scene-index": index } as CSSProperties}>
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone={index % 2 === 0 ? "cream" : "rose"}
                sizes={mode === "hero" ? "(max-width: 900px) 42vw, 14vw" : "(max-width: 900px) 36vw, 11vw"}
                priority={mode === "hero" && index === 0}
              />
              <figcaption>{photo.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
