import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

export function CanvasParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isLowPower = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isLowPower) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const targetFps = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFps;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.15 - 0.1,
        r: 2 + Math.random() * 4,
        alpha: 0.08 + Math.random() * 0.12,
      });
    }

    const rafRef = { id: 0 };
    let lastFrameTime = 0;
    const draw = (currentTime: number) => {
      if (!document.hidden) {
        const elapsed = currentTime - lastFrameTime;
        if (elapsed >= frameInterval) {
          lastFrameTime = currentTime - (elapsed % frameInterval);
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -20) p.x = window.innerWidth + 20;
            if (p.x > window.innerWidth + 20) p.x = -20;
            if (p.y < -20) p.y = window.innerHeight + 20;
            if (p.y > window.innerHeight + 20) p.y = -20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 210, 184, ${p.alpha})`;
            ctx.fill();
          }
        }
      }
      rafRef.id = requestAnimationFrame(draw);
    };

    const startDelay = setTimeout(() => {
      rafRef.id = requestAnimationFrame(draw);
    }, 600);

    return () => {
      clearTimeout(startDelay);
      cancelAnimationFrame(rafRef.id);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-particles"
      aria-hidden="true"
    />
  );
}
