import { useEffect, useRef } from "react";

export function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    let lightLeakTimer = 0;
    let lightLeakActive = false;
    let leakX = 0;
    let leakOpacity = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // 1. Film grain — subtle noise
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 30;
        data[i] = 255 + noise;
        data[i + 1] = 245 + noise;
        data[i + 2] = 230 + noise;
        data[i + 3] = 8;
      }
      ctx.putImageData(imageData, 0, 0);

      // 2. Light leak — random warm beams
      lightLeakTimer++;
      if (!lightLeakActive && lightLeakTimer > 200 + Math.random() * 400) {
        lightLeakActive = true;
        lightLeakTimer = 0;
        leakX = Math.random() * w;
        leakOpacity = 0;
      }

      if (lightLeakActive) {
        leakOpacity += 0.008;
        if (leakOpacity > 0.12) leakOpacity = 0.12;

        const gradient = ctx.createRadialGradient(leakX, 0, 0, leakX, 0, h * 0.8);
        gradient.addColorStop(0, `rgba(255, 180, 120, ${leakOpacity})`);
        gradient.addColorStop(0.3, `rgba(255, 150, 100, ${leakOpacity * 0.5})`);
        gradient.addColorStop(1, "rgba(255, 150, 100, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        leakX += 2;
        if (leakX > w + 200) {
          lightLeakActive = false;
          lightLeakTimer = 0;
        }
      }

      requestAnimationFrame(draw);
    };

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9995,
        pointerEvents: "none",
        mixBlendMode: "overlay",
        opacity: 0.6,
      }}
    />
  );
}
