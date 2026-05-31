import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import type { PhotoItem } from "../types/photo";

/* ══════════════════════════════════════════════
   Single photo card
   ══════════════════════════════════════════════ */
const PhotoCard = memo(function PhotoCard({
  url,
  angle,
  radius,
  yOffset,
  width,
  height,
  index,
  isFocused,
  onClick,
}: {
  url: string | null;
  angle: number;
  radius: number;
  yOffset: number;
  width: number;
  height: number;
  index: number;
  isFocused: boolean;
  onClick: () => void;
}) {
  if (url) {
    return (
      <div
        className="pw3d-card"
        onClick={onClick}
        style={{
          width,
          height,
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -width / 2,
          marginTop: -height / 2,
          transform: `rotateY(${angle}rad) translateZ(${radius}px) translateY(${yOffset}px)`,
          backfaceVisibility: "hidden",
          borderRadius: 14,
          overflow: "hidden",
          cursor: "pointer",
          boxShadow: isFocused
            ? "0 8px 32px rgba(0,0,0,0.35)"
            : "0 4px 16px rgba(0,0,0,0.15)",
          opacity: isFocused ? 1 : 0.92,
          transition: "box-shadow 0.4s ease, opacity 0.3s ease",
        }}
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  const colors = ["#D4A88C", "#E0BCA4", "#C0947A", "#8FB88A", "#A2C89D", "#7AA675"];
  return (
    <div
      style={{
        width,
        height,
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -width / 2,
        marginTop: -height / 2,
        transform: `rotateY(${angle}rad) translateZ(${radius}px) translateY(${yOffset}px)`,
        backfaceVisibility: "hidden",
        borderRadius: 14,
        background: colors[index % colors.length],
        opacity: 0.15,
      }}
    />
  );
});

/* ══════════════════════════════════════════════
   FocusOverlay — shown when a photo is focused
   ══════════════════════════════════════════════ */
const FocusOverlay = memo(function FocusOverlay({
  photo,
  onClose,
}: {
  photo: PhotoItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

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
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "3px 10px",
              borderRadius: 20,
              background: "rgba(255,249,236,0.15)",
              backdropFilter: "blur(6px)",
            }}
          >
            {t(`gallery.filters.${photo.style}`, photo.style)}
          </span>
          <span
            style={{
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "rgba(255,249,236,0.7)",
            }}
          >
            <MapPin size={11} />
            {photo.location}
          </span>
        </div>
        <strong
          style={{
            fontSize: "clamp(18px, 2.5vw, 26px)",
            fontFamily: "var(--font-display-cn)",
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {photo.title}
        </strong>
      </motion.div>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
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
});

/* ══════════════════════════════════════════════
   PhotoWall3DCss — main exported component
   ══════════════════════════════════════════════ */
export const PhotoWall3DCss = memo(function PhotoWall3DCss() {
  const { photos } = usePublicPhotos();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const velocityRef = useRef(0);
  const rotationRef = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const rafId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  const count = useMemo(() => Math.min(photos.length || 6, 16), [photos.length]);

  const items = useMemo(() => {
    if (photos.length === 0) {
      return Array.from({ length: 6 }).map((_, i) => ({
        url: null as string | null,
        angle: (i / 6) * Math.PI * 2,
        y: (i % 3 - 1) * 28,
        w: 130 + (i % 3) * 16,
        h: 180 + ((i + 1) % 3) * 16,
        photoIdx: i,
      }));
    }
    return Array.from({ length: count }).map((_, i) => {
      const photo = photos[i % photos.length];
      return {
        url: photo.imageUrl || null,
        angle: (i / count) * Math.PI * 2,
        y: (i % 3 - 1) * 24,
        w: 130 + (i % 3) * 12,
        h: 180 + ((i + 1) % 3) * 12,
        photoIdx: i,
      };
    });
  }, [photos, count]);

  /* ── Animation loop ── */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastTime = performance.now();
    let running = false;

    const stopLoop = () => {
      if (running) {
        cancelAnimationFrame(rafId.current);
        running = false;
      }
    };

    const tick = (now: number) => {
      if (document.hidden || !isVisibleRef.current) {
        running = false;
        return;
      }

      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (focusedIndex !== null) {
        const targetAngle = -(focusedIndex / count) * Math.PI * 2;
        const current = rotationRef.current;
        const diff = targetAngle - current;
        rotationRef.current += diff * 0.06;
      } else if (!isDragging.current) {
        velocityRef.current += (0.10 * delta - velocityRef.current) * 0.02;
        rotationRef.current += velocityRef.current;
      }

      setRotation(rotationRef.current);
      rafId.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running || document.hidden || !isVisibleRef.current) return;
      running = true;
      lastTime = performance.now();
      rafId.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) startLoop();
        else stopLoop();
      },
      { threshold: 0.12 },
    );
    observer.observe(stage);
    const rect = stage.getBoundingClientRect();
    isVisibleRef.current = !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight;

    const onVisibilityChange = () => {
      if (document.hidden) {
        isVisibleRef.current = false;
        stopLoop();
        return;
      }
      const rect = stage.getBoundingClientRect();
      isVisibleRef.current = rect.bottom > 0 && rect.top < window.innerHeight;
      if (isVisibleRef.current) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    startLoop();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopLoop();
    };
  }, [focusedIndex, count]);

  /* ── Pointer handlers ── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (focusedIndex !== null) return;
      isDragging.current = true;
      lastX.current = e.clientX;
      velocityRef.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [focusedIndex],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      rotationRef.current += dx * 0.005;
      velocityRef.current = dx * 0.01;
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleFocusChange = useCallback((i: number | null) => {
    setFocusedIndex(i);
  }, []);

  const focusedPhoto =
    focusedIndex !== null ? photos[focusedIndex % photos.length] : null;

  return (
    <motion.section
      className="photo-wall-3d"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    >
      <div
        ref={stageRef}
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            perspective: 900,
            perspectiveOrigin: "50% 50%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 0,
              height: 0,
              transformStyle: "preserve-3d",
              transform: `rotateY(${rotation}rad)`,
              willChange: "transform",
            }}
          >
            {items.map((item, i) => (
              <PhotoCard
                key={i}
                url={item.url}
                angle={item.angle}
                radius={320}
                yOffset={item.y}
                width={item.w}
                height={item.h}
                index={item.photoIdx}
                isFocused={focusedIndex === i}
                onClick={() => handleFocusChange(i)}
              />
            ))}
          </div>
        </div>

        {focusedPhoto && (
          <FocusOverlay
            photo={focusedPhoto}
            onClose={() => setFocusedIndex(null)}
          />
        )}
      </div>
    </motion.section>
  );
});
