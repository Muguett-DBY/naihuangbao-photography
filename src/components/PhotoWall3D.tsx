import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { usePublicPhotos } from "../hooks/usePublicPhotos";

/**
 * Auto-rotating group of photo planes
 */
function Carousel({
  count = 12,
  radius = 4,
}: {
  count?: number;
  radius?: number;
}) {
  const groupRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  // Pastel palette matching the photography theme
  const colors = [
    "#D4A88C", "#E0BCA4", "#C0947A",
    "#8FB88A", "#A2C89D", "#7AA675",
    "#E8C87A", "#D4B05E",
    "#D48383", "#E09A9A",
    "#889DF0", "#B77DEE",
  ];

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const y = (i % 3 - 1) * 0.6;
        const w = 1.6 + (i % 3) * 0.2;
        const h = 2.2 + ((i + 1) % 3) * 0.2;
        const color = colors[i % colors.length];

        return (
          <mesh
            key={i}
            position={[x, y, z]}
            rotation={[0, -angle + Math.PI, ((i % 5) - 2) * 0.04]}
          >
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.25 + (i % 3) * 0.08}
              side={2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * 3D Photo Wall — rotating abstract photo card carousel
 * Uses decorative colored planes as a visual backdrop.
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
            "radial-gradient(ellipse at center, rgba(212,168,140,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      >
        <Canvas
          camera={{ position: [0, 0.3, 6.5], fov: 48 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
        >
          <Carousel count={Math.min(photos.length || 12, 16)} />
        </Canvas>
      </div>
    </motion.section>
  );
}
