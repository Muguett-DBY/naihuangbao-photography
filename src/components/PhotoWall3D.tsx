import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import type { PhotoItem } from "../types/photo";

/* ══════════════════════════════════════════════
   Single photo plane with texture
   ══════════════════════════════════════════════ */
function PhotoPlane({
  url,
  position,
  rotation,
  size,
  opacity = 1,
  isFocused,
  onClick,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  opacity?: number;
  isFocused?: boolean;
  onClick?: () => void;
}) {
  const texture = useTexture(url);

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { document.body.style.cursor = "default"; }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={isFocused ? 1 : opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ══════════════════════════════════════════════
   Carousel — auto-rotating, draggable, focusable
   ══════════════════════════════════════════════ */
function Carousel({
  photos,
  radius = 4,
  focusedIndex,
  onFocusChange,
}: {
  photos: PhotoItem[];
  radius?: number;
  focusedIndex: number | null;
  onFocusChange: (i: number | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRot = useRef(0);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const count = Math.min(photos.length || 6, 16);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const g = groupRef.current;

    if (focusedIndex !== null) {
      // Snap to target: center the focused photo
      const targetAngle = -(focusedIndex / count) * Math.PI * 2;
      targetRot.current += (targetAngle - g.rotation.y - targetRot.current) * 0.06;
    } else if (!isDragging.current) {
      // Auto-rotate with momentum decay
      velocity.current += (0.10 * delta - velocity.current) * 0.02;
      targetRot.current += velocity.current;
    }

    // Smooth interpolation
    g.rotation.y += (targetRot.current - g.rotation.y) * 0.08;
  });

  // Expose drag handler ref via DOM events on canvas wrapper
  useEffect(() => {
    const canvas = groupRef.current?.parent?.parent as HTMLElement | null;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      if (focusedIndex !== null) return;
      isDragging.current = true;
      lastX.current = e.clientX;
      velocity.current = 0;
    };

    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      targetRot.current += dx * 0.005;
      velocity.current = dx * 0.01;
    };

    const onUp = () => {
      isDragging.current = false;
    };

    // Find the canvas element
    const glCanvas = canvas.querySelector("canvas");
    if (glCanvas) {
      glCanvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    return () => {
      if (glCanvas) {
        glCanvas.removeEventListener("pointerdown", onDown);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [focusedIndex]);

  const items = useMemo(() => {
    if (photos.length === 0) {
      return Array.from({ length: 6 }).map((_, i) => ({
        url: null as string | null,
        angle: (i / 6) * Math.PI * 2,
        y: (i % 3 - 1) * 0.6,
        w: 1.6 + (i % 3) * 0.2,
        h: 2.2 + ((i + 1) % 3) * 0.2,
        color: ["#D4A88C", "#E0BCA4", "#C0947A", "#8FB88A", "#A2C89D", "#7AA675"][i],
        photoIdx: i,
      }));
    }

    return Array.from({ length: count }).map((_, i) => {
      const photo = photos[i % photos.length];
      const angle = (i / count) * Math.PI * 2;
      return {
        url: photo.imageUrl || null,
        angle,
        y: (i % 3 - 1) * 0.5,
        w: 1.6 + (i % 3) * 0.15,
        h: 2.2 + ((i + 1) % 3) * 0.15,
        color: undefined as string | undefined,
        photoIdx: i,
      };
    });
  }, [photos, count]);

  if (items.length === 0) return null;

  return (
    <group ref={groupRef}>
      {items.map((item, i) => {
        const angle = item.angle;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const pos: [number, number, number] = [x, item.y, z];
        const rot: [number, number, number] = [0, -angle + Math.PI, ((i % 5) - 2) * 0.03];
        const isFocused = focusedIndex === i;

        if (item.url) {
          return (
            <PhotoPlane
              key={i}
              url={item.url}
              position={pos}
              rotation={rot}
              size={[item.w, item.h]}
              opacity={isFocused ? 1 : 0.92}
              isFocused={isFocused}
              onClick={() => onFocusChange(i)}
            />
          );
        }

        return (
          <mesh
            key={i}
            position={pos}
            rotation={rot}
            onClick={() => {}}
          >
            <planeGeometry args={[item.w, item.h]} />
            <meshBasicMaterial
              color={item.color}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ══════════════════════════════════════════════
   Info overlay — shown when a photo is focused
   ══════════════════════════════════════════════ */
function FocusOverlay({
  photo,
  onClose,
}: {
  photo: PhotoItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // Prevent click from propagating to canvas
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="photo-wall-3d-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleBackdrop}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-start",
        background: "linear-gradient(transparent 50%, rgba(0,0,0,0.4))",
        padding: "clamp(20px, 4vw, 36px)",
        borderRadius: 24,
        cursor: "default",
      }}
    >
      <motion.div
        className="photo-wall-3d-info"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          color: "#FFF9EC",
          textShadow: "0 2px 12px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "3px 10px",
            borderRadius: 20,
            background: "rgba(255,249,236,0.15)",
            backdropFilter: "blur(6px)",
          }}>
            {t(`gallery.filters.${photo.style}`, photo.style)}
          </span>
          <span style={{
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(255,249,236,0.7)",
          }}>
            <MapPin size={11} />
            {photo.location}
          </span>
        </div>
        <strong style={{
          fontSize: "clamp(18px, 2.5vw, 26px)",
          fontFamily: "var(--font-display-cn)",
          fontWeight: 600,
          lineHeight: 1.2,
        }}>
          {photo.title}
        </strong>
      </motion.div>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(255,249,236,0.3)",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(8px)",
          color: "#FFF9EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 16,
        }}
        aria-label={t("photoWall3D.close")}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   PhotoWall3D — main exported component
   ══════════════════════════════════════════════ */
export function PhotoWall3D() {
  const { photos } = usePublicPhotos();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleFocusChange = useCallback((i: number | null) => {
    setFocusedIndex(i);
  }, []);

  const focusedPhoto = focusedIndex !== null
    ? photos[focusedIndex % photos.length]
    : null;

  return (
    <motion.section
      className="photo-wall-3d"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    >
      <div
        style={{
          width: "100%",
          height: "min(60vh, 480px)",
          position: "relative",
          borderRadius: 24,
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at center, rgba(212,168,140,0.08) 0%, transparent 70%)",
          cursor: focusedIndex !== null ? "default" : "grab",
          userSelect: "none",
        }}
        className="photo-wall-3d-stage"
      >
        <Canvas
          camera={{ position: [0, 0.3, 6.5], fov: 48 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
        >
          <Carousel
            photos={photos}
            focusedIndex={focusedIndex}
            onFocusChange={handleFocusChange}
          />
        </Canvas>

        {focusedPhoto && (
          <FocusOverlay
            photo={focusedPhoto}
            onClose={() => setFocusedIndex(null)}
          />
        )}
      </div>
    </motion.section>
  );
}
