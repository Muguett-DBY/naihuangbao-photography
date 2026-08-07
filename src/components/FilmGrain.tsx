import { useEffect, useRef } from "react";

const GRAIN_SIZE = 96;

function supportsFilmGrain() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 768px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return (navigator.hardwareConcurrency || 4) > 2;
}

export function FilmGrain() {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const enabled = supportsFilmGrain();

  useEffect(() => {
    if (!enabled) return;
    const canvas = grainRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const imageData = context.createImageData(GRAIN_SIZE, GRAIN_SIZE);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const noise = (Math.random() - 0.5) * 34;
      pixels[index] = 250 + noise;
      pixels[index + 1] = 243 + noise;
      pixels[index + 2] = 230 + noise;
      pixels[index + 3] = 12;
    }
    context.putImageData(imageData, 0, 0);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={grainRef}
      className="film-grain-layer"
      data-film-grain="static"
      aria-hidden="true"
      width={GRAIN_SIZE}
      height={GRAIN_SIZE}
    />
  );
}
