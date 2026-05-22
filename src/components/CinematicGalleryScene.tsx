import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type * as Three from "three";
import type { PhotoItem } from "../types/photo";
import { MAX_CINEMATIC_PHOTOS } from "../lib/cinematic-gallery";
import { ImageWithFallback } from "./ImageWithFallback";

type CinematicGallerySceneProps = {
  photos: PhotoItem[];
  mode: "hero" | "gallery";
  className?: string;
};

type WebGLState = "pending" | "ready" | "fallback";

function canCreateWebGLContext() {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2") ??
    canvas.getContext("webgl") ??
    canvas.getContext("experimental-webgl");
  return Boolean(context);
}

export function CinematicGalleryScene({
  photos,
  mode,
  className = "",
}: CinematicGallerySceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglState, setWebglState] = useState<WebGLState>("pending");
  const scenePhotos = useMemo(
    () => photos.filter((photo) => Boolean(photo.imageUrl)).slice(0, MAX_CINEMATIC_PHOTOS),
    [photos],
  );
  const fallbackPhotos = scenePhotos.slice(0, mode === "hero" ? 5 : 8);

  useEffect(() => {
    const root = rootRef.current;
    const mount = mountRef.current;
    if (!root || !mount || scenePhotos.length === 0) {
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
        renderer.setClearColor(0xfff6e8, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.dataset.cinematicCanvas = mode;
        mountElement.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xfff0df, 7, 26);
        const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
        camera.position.set(0, 0.05, 4.8);

        const galleryGroup = new THREE.Group();
        scene.add(galleryGroup);

        const geometry = new THREE.PlaneGeometry(1.78, 2.28, 1, 1);
        const loader = new THREE.TextureLoader();
        const planes: Array<{
          mesh: Three.Mesh<Three.PlaneGeometry, Three.MeshBasicMaterial>;
          baseRotation: number;
          baseY: number;
        }> = [];
        const palette = [0xffd6bd, 0xf8e8c9, 0xdde7ce, 0xffc4b4, 0xf5dcc6];

        scenePhotos.forEach((photo, index) => {
          const material = new THREE.MeshBasicMaterial({
            color: palette[index % palette.length],
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          const lane = (index % 4) - 1.5;
          const depth = -index * 1.18 - 1.1;
          const baseY = Math.sin(index * 0.74) * 0.34;
          const baseRotation = ((index % 5) - 2) * 0.055;

          mesh.position.set(lane * 1.03, baseY, depth);
          mesh.rotation.set(0, lane * -0.09, baseRotation);
          mesh.scale.setScalar(index % 3 === 0 ? 1.08 : 0.94);
          galleryGroup.add(mesh);
          planes.push({ mesh, baseRotation, baseY });

          loader.load(
            photo.imageUrl,
            (texture: Three.Texture) => {
              if (disposed) {
                texture.dispose();
                return;
              }
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
              material.map = texture;
              material.needsUpdate = true;
              renderFrame(performance.now());
            },
            undefined,
            () => {
              material.opacity = 0.72;
            },
          );
        });

        const travelDistance = Math.max(6.8, scenePhotos.length * 1.02);
        const progress = { value: 0 };
        let sceneLift = mode === "hero" ? 0.28 : 0.18;

        function resize() {
          if (disposed) return;
          const width = Math.max(1, mountElement.clientWidth);
          const height = Math.max(1, mountElement.clientHeight);
          const isNarrow = width < 700;
          sceneLift = isNarrow ? (mode === "hero" ? 0.86 : 0.78) : (mode === "hero" ? 0.28 : 0.18);
          camera.aspect = width / height;
          camera.fov = isNarrow ? 63 : mode === "hero" ? 50 : 55;
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
          renderer.setSize(width, height, false);

          const laneScale = isNarrow ? 0.72 : 1.03;
          planes.forEach(({ mesh }, index) => {
            const lane = (index % 4) - 1.5;
            mesh.position.x = lane * laneScale;
          });
          renderFrame(performance.now());
        }

        function renderFrame(time: number) {
          const p = progress.value;
          const shimmer = Math.sin(time * 0.0007) * 0.035;
          camera.position.z = 4.8 - p * travelDistance;
          camera.position.x = Math.sin(p * Math.PI * 1.7) * 0.28;
          camera.position.y = 0.12 + Math.cos(p * Math.PI * 1.35) * 0.12;
          camera.rotation.y = Math.sin(p * Math.PI * 1.4) * 0.035;
          camera.rotation.x = -0.018 + Math.cos(p * Math.PI * 1.2) * 0.012;

          galleryGroup.rotation.y = (p - 0.5) * -0.12;
          galleryGroup.position.y = sceneLift + shimmer;

          planes.forEach(({ mesh, baseRotation, baseY }, index) => {
            const material = mesh.material;
            const distance = Math.abs(mesh.position.z - camera.position.z);
            material.opacity = THREE.MathUtils.clamp(1 - distance / 21, 0.26, 0.96);
            mesh.position.y = baseY + Math.sin(time * 0.0009 + index) * 0.025;
            mesh.rotation.z = baseRotation + Math.sin(time * 0.00055 + index * 0.4) * 0.018;
          });

          renderer.render(scene, camera);
        }

        function tick(time: number) {
          frameId = null;
          if (!active || disposed) return;
          renderFrame(time);
          frameId = requestAnimationFrame(tick);
        }

        const scrollTrigger = ScrollTrigger.create({
          trigger: rootElement,
          start: mode === "gallery" ? "top top" : "top 20%",
          end: mode === "gallery" ? "+=240%" : "bottom top",
          pin: mode === "gallery",
          scrub: mode === "gallery" ? 0.85 : 0.55,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progress.value = self.progress;
            renderFrame(performance.now());
          },
        });

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
          scrollTrigger.kill();
          window.removeEventListener("resize", resize);
          if (frameId !== null) {
            cancelAnimationFrame(frameId);
          }
          geometry.dispose();
          planes.forEach(({ mesh }) => {
            mesh.material.map?.dispose();
            mesh.material.dispose();
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
    >
      <div className="cinematic-webgl" ref={mountRef} aria-hidden="true" />
      <div className="cinematic-grain" aria-hidden="true" />
      <div className="cinematic-fallback" aria-label="电影胶片作品预览">
        {fallbackPhotos.map((photo, index) => (
          <figure key={photo.id} style={{ "--scene-index": index } as CSSProperties}>
            <ImageWithFallback
              src={photo.imageUrl}
              alt={photo.alt}
              title={photo.title}
              tone={index % 2 === 0 ? "cream" : "rose"}
              sizes={mode === "hero" ? "(max-width: 900px) 45vw, 18vw" : "(max-width: 900px) 38vw, 14vw"}
              priority={mode === "hero" && index === 0}
            />
            <figcaption>{photo.title}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
