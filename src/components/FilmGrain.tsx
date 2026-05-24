import { useEffect, useRef } from "react";

const GRAIN_SIZE = 128;

export function FilmGrain() {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const leakRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ── Grain: small canvas, low FPS ──
    const grain = grainRef.current;
    if (!grain) return;
    const gCtx = grain.getContext("2d");
    if (!gCtx) return;

    let frame = 0;
    let rafId = 0;

    const updateGrain = () => {
      frame++;
      // Only update grain every 6 frames (~10fps)
      if (frame % 6 === 0) {
        gCtx.clearRect(0, 0, GRAIN_SIZE, GRAIN_SIZE);
        const imageData = gCtx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 40;
          data[i] = 255 + noise;
          data[i + 1] = 245 + noise;
          data[i + 2] = 230 + noise;
          data[i + 3] = 10;
        }
        gCtx.putImageData(imageData, 0, 0);
      }
      rafId = requestAnimationFrame(updateGrain);
    };
    rafId = requestAnimationFrame(updateGrain);

    // ── Light leak ──
    const leak = leakRef.current;
    if (!leak) return;
    const lCtx = leak.getContext("2d");
    if (!lCtx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    leak.width = w;
    leak.height = h;

    let leakTimer = 0;
    let leakActive = false;
    let leakX = 0;
    let leakOpacity = 0;

    const updateLeak = () => {
      lCtx.clearRect(0, 0, w, h);

      leakTimer++;
      if (!leakActive && leakTimer > 300 + Math.random() * 500) {
        leakActive = true;
        leakTimer = 0;
        leakX = Math.random() * w;
        leakOpacity = 0;
      }

      if (leakActive) {
        leakOpacity += 0.005;
        if (leakOpacity > 0.08) leakOpacity = 0.08;

        const gradient = lCtx.createRadialGradient(leakX, 0, 0, leakX, 0, h * 0.6);
        gradient.addColorStop(0, `rgba(255, 180, 120, ${leakOpacity})`);
        gradient.addColorStop(0.3, `rgba(255, 150, 100, ${leakOpacity * 0.5})`);
        gradient.addColorStop(1, "rgba(255, 150, 100, 0)");
        lCtx.fillStyle = gradient;
        lCtx.fillRect(0, 0, w, h);

        leakX += 1.5;
        if (leakX > w + 200) {
          leakActive = false;
          leakTimer = 0;
        }
      }

      requestAnimationFrame(updateLeak);
    };
    requestAnimationFrame(updateLeak);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      leak.width = w;
      leak.height = h;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(rafId + 1);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      {/* Grain — small canvas scaled up */}
      <canvas
        ref={grainRef}
        width={GRAIN_SIZE}
        height={GRAIN_SIZE}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9995,
          pointerEvents: "none",
          mixBlendMode: "overlay",
          opacity: 0.5,
          imageRendering: "pixelated",
        }}
      />
      {/* Light leak — full canvas, rare updates */}
      <canvas
        ref={leakRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9994,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: 0.8,
        }}
      />
    </>
  );
}
