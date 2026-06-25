import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

export function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  className,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastUpdate = useRef(0);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const updatePos = useCallback((clientX: number) => {
    const now = Date.now();
    if (now - lastUpdate.current < 16) return;
    lastUpdate.current = now;

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    setPos(clamp((x / rect.width) * 100));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePos(e.clientX);
  }, [updatePos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    updatePos(e.clientX);
  }, [updatePos]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onDoubleClick = useCallback(() => {
    setPos(50);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPos((p) => clamp(p - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPos((p) => clamp(p + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPos(100);
    }
  }, []);

  return (
    <div className={`compare-slider-wrap ${className || ""}`}>
      <div
        ref={containerRef}
        className="compare-slider"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        role="slider"
        aria-label={t("compare.dragHint")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <img
          className="compare-slider-before"
          src={beforeSrc}
          alt={beforeAlt}
          draggable={false}
        />
        <div
          className="compare-slider-after-clip"
          style={{ width: `${pos}%` }}
        >
          <img
            className="compare-slider-after"
            src={afterSrc}
            alt={afterAlt}
            draggable={false}
          />
        </div>
        <div className="compare-slider-handle" style={{ left: `${pos}%` }}>
          <span className="compare-slider-handle-line" />
          <span className="compare-slider-handle-diamond" />
          <span className="compare-slider-handle-line" />
        </div>
        <span className="compare-slider-label compare-slider-label--before">
          {t("compare.before")}
        </span>
        <span className="compare-slider-label compare-slider-label--after">
          {t("compare.after")}
        </span>
        <span className="compare-slider-percentage">{Math.round(pos)}%</span>
      </div>
      <div className="compare-slider-controls">
        <button
          type="button"
          className="compare-slider-reset"
          onClick={() => setPos(50)}
          aria-label={t("compare.reset", "Reset position")}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
