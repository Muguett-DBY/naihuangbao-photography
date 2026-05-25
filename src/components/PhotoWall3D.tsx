import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import type { PhotoItem } from "../types/photo";

/**
 * Single photo plane with texture
 */
function PhotoPlane({
  url,
  position,
  rotation,
  size,
  opacity = 1,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  opacity?: number;
}) {
  const texture = useTexture(url);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Auto-rotating group of photo planes
 */
function Carousel({
  photos,
  radius = 4,
}: {
  photos: PhotoItem[];
  radius?: number;
}) {
  const groupRef = useRef<any>(null);
  const count = Math.min(photos.length || 6, 16);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.10;
    }
  });

  const items = useMemo(() => {
    if (photos.length === 0) {
      // Fallback: show placeholders if no photos
      return Array.from({ length: 6 }).map((_, i) => ({
        url: null as string | null,
        angle: (i / 6) * Math.PI * 2,
        y: (i % 3 - 1) * 0.6,
        w: 1.6 + (i % 3) * 0.2,
        h: 2.2 + ((i + 1) % 3) * 0.2,
        color: ["#D4A88C", "#E0BCA4", "#C0947A", "#8FB88A", "#A2C89D", "#7AA675"][i],
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

        if (item.url) {
          return (
            <PhotoPlane
              key={i}
              url={item.url}
              position={pos}
              rotation={rot}
              size={[item.w, item.h]}
              opacity={0.92}
            />
          );
        }

        // Fallback empty plane
        return (
          <mesh key={i} position={pos} rotation={rot}>
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

/**
 * 3D Photo Wall — rotating photo card carousel with actual photo textures
 */
export function PhotoWall3D() {
  const { photos } = usePublicPhotos();

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
        }}
        aria-hidden="true"
      >
        <Canvas
          camera={{ position: [0, 0.3, 6.5], fov: 48 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
        >
          <Carousel photos={photos} />
        </Canvas>
      </div>
    </motion.section>
  );
}
