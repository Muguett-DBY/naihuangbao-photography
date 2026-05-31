import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Download, Eye } from "lucide-react";

const PRESET_FILTERS: Record<string, string> = {
  "film-look": "contrast(1.1) saturate(0.9) sepia(0.15)",
  warm: "sepia(0.2) saturate(1.2) brightness(1.05)",
  cool: "saturate(0.9) hue-rotate(10deg) brightness(1.05)",
  vintage: "sepia(0.35) contrast(0.9) brightness(1.1)",
  bw: "grayscale(1) contrast(1.1)",
  matte: "contrast(0.85) brightness(1.15) saturate(0.8)",
};

const FILTER_KEYS = [
  "film-look",
  "warm",
  "cool",
  "vintage",
  "bw",
  "matte",
] as const;

function interpolateFilter(
  base: string,
  intensity: number,
): string {
  if (intensity === 0) return "none";
  const t = intensity / 100;
  return base.replace(
    /(\w+[-\w]*)\(([^)]+)\)/g,
    (_match, fn: string, val: string) => {
      if (fn === "none") return "";
      if (fn === "hue-rotate") {
        const deg = parseFloat(val);
        return `hue-rotate(${deg * t}deg)`;
      }
      const num = parseFloat(val);
      const identity =
        fn === "grayscale" || fn === "sepia" ? 0 : 1;
      const result = identity + (num - identity) * t;
      return `${fn}(${Number(result.toFixed(3))})`;
    },
  );
}

export function PresetPreview({ presetId }: { presetId?: string }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<string>(
    presetId && PRESET_FILTERS[presetId] ? presetId : "film-look",
  );
  const [intensity, setIntensity] = useState(75);
  const [showAfter, setShowAfter] = useState(true);
  const [hasImage, setHasImage] = useState(false);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    if (showAfter && intensity > 0) {
      ctx.filter = interpolateFilter(
        PRESET_FILTERS[selectedFilter],
        intensity,
      );
    } else {
      ctx.filter = "none";
    }
    ctx.drawImage(img, 0, 0);
  }, [selectedFilter, intensity, showAfter]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setHasImage(true);
        URL.revokeObjectURL(url);
        if (objectUrlRef.current === url) objectUrlRef.current = null;
        drawCanvas();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        if (objectUrlRef.current === url) objectUrlRef.current = null;
      };
      img.src = url;
    },
    [drawCanvas],
  );

  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const handleFilterChange = useCallback(
    (filter: string) => {
      setSelectedFilter(filter);
      requestAnimationFrame(() => drawCanvas());
    },
    [drawCanvas],
  );

  const handleIntensityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIntensity(Number(e.target.value));
      requestAnimationFrame(() => drawCanvas());
    },
    [drawCanvas],
  );

  const handleToggle = useCallback(() => {
    setShowAfter((prev) => {
      requestAnimationFrame(() => drawCanvas());
      return !prev;
    });
  }, [drawCanvas]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `preset-${selectedFilter}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [selectedFilter]);

  return (
    <div className="preset-preview">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="preset-preview-upload"
        onChange={handleFileChange}
        aria-label={t("presetPreview.upload")}
      />

      <div className="preset-preview-canvas">
        <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
        {!hasImage && (
          <button
            type="button"
            className="preset-preview-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} />
            <span>{t("presetPreview.upload")}</span>
          </button>
        )}
      </div>

      <div className="preset-preview-controls">
        <div className="preset-preview-filters">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`preset-preview-filter-btn${selectedFilter === key ? " is-active" : ""}`}
              onClick={() => handleFilterChange(key)}
            >
              {t(`presetPreview.filters.${key}`)}
            </button>
          ))}
        </div>

        <label className="preset-preview-intensity">
          {t("presetPreview.intensity")}: {intensity}%
          <input
            type="range"
            min={0}
            max={100}
            value={intensity}
            onChange={handleIntensityChange}
          />
        </label>

        <div className="preset-preview-actions">
          <button
            type="button"
            className="preset-preview-toggle-btn"
            onClick={handleToggle}
            disabled={!hasImage}
          >
            <Eye size={16} />
            {showAfter ? t("presetDetail.after") : t("presetDetail.before")}
          </button>
          <button
            type="button"
            className="preset-preview-download"
            onClick={handleDownload}
            disabled={!hasImage}
          >
            <Download size={16} />
            {t("presetPreview.download")}
          </button>
        </div>
      </div>
    </div>
  );
}
