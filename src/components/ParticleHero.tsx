import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ParticleHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 180;

    // ——— Generate particle targets from text ———
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 120);

    // Draw text
    ctx.font = "Bold 72px 'Naihuangbao WenKai','Kaiti SC',serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";
    ctx.fillText("奶黄包摄影", 200, 60);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, 400, 120);
    const targets: { x: number; y: number }[] = [];
    const step = 3;
    for (let y = 0; y < 120; y += step) {
      for (let x = 0; x < 400; x += step) {
        const i = (y * 400 + x) * 4;
        if (imageData.data[i + 3] > 128) {
          targets.push({
            x: (x - 200) * 0.5,
            y: (60 - y) * 0.5,
          });
        }
      }
    }

    // Limit particles
    const count = Math.min(targets.length, 3000);

    // Create positions
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const targetPos = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random start positions
      positions[i * 3] = (Math.random() - 0.5) * 300;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

      // Target positions from text
      const idx = i % targets.length;
      targetPos[i * 3] = targets[idx].x;
      targetPos[i * 3 + 1] = targets[idx].y;
      targetPos[i * 3 + 2] = 0;

      // Colors — warm palette
      const hue = 0.05 + Math.random() * 0.08; // orange range
      const c = new THREE.Color().setHSL(hue, 0.6, 0.5 + Math.random() * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 1.5 + Math.random() * 2.5;
      velocities[i] = 0.003 + Math.random() * 0.005;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Texture for particles
    const particleCanvas = document.createElement("canvas");
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pctx = particleCanvas.getContext("2d")!;
    const gradient = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(255,220,200,0.8)");
    gradient.addColorStop(1, "rgba(255,200,180,0)");
    pctx.fillStyle = gradient;
    pctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(particleCanvas);

    const material = new THREE.PointsMaterial({
      size: 2.5,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    let progress = 0; // 0 = scattered, 1 = converged
    let targetProgress = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / w - 0.5) * 2;
      mouse.y = -(e.clientY / h - 0.5) * 2;
    };
    document.addEventListener("mousemove", onMouseMove);

    // Scroll trigger convergence
    let scrolled = false;
    const onScroll = () => {
      if (!scrolled) {
        scrolled = true;
        targetProgress = 1;
        setTimeout(() => {
          material.opacity = 0;
        }, 2500);
      }
    };
    window.addEventListener("scroll", onScroll, { once: true });

    // Auto-converge after 1.5s if no scroll
    const autoTimer = setTimeout(() => {
      targetProgress = 1;
    }, 2500);

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      // Smooth progress
      progress += (targetProgress - progress) * 0.008;

      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Target = text position when converged, else random scatter
        const tx = targetPos[i3];
        const ty = targetPos[i3 + 1];
        const tz = targetPos[i3 + 2];

        // Add mouse influence
        const mx = mouse.x * 8;
        const my = mouse.y * 8;

        // Converge toward target
        pos[i3] += ((tx + mx - pos[i3]) * progress + (0 - pos[i3]) * (1 - progress)) * 0.03;
        pos[i3 + 1] += ((ty + my - pos[i3 + 1]) * progress + (0 - pos[i3 + 1]) * (1 - progress)) * 0.03;
        pos[i3 + 2] += ((tz - pos[i3 + 2]) * progress + (0 - pos[i3 + 2]) * (1 - progress)) * 0.03;

        // Add subtle idle wave when converged
        if (progress > 0.8) {
          pos[i3 + 1] += Math.sin(time * 0.5 + phases[i]) * 0.05;
          pos[i3] += Math.cos(time * 0.4 + phases[i]) * 0.05;
        }
      }

      geometry.attributes.position.needsUpdate = true;

      // Fade out when progressed past convergence
      if (progress > 0.95) {
        material.opacity = Math.max(0, material.opacity - 0.003);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(autoTimer);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
