import "../styles/platform-v3.css";
import { Aperture, Download, FileImage, ImagePlus, Layers3, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CompositionCanvas, type CompositionImage } from "../components/CompositionCanvas";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { useSEO } from "../hooks/useSEO";
import type { CompositionMode } from "../lib/composition-layout";
import { track } from "../utils/track";

const sampleImages: CompositionImage[] = [
  { id: "sample-garden", src: "/images/optical-archive/optical-garden-hero-v1.webp", name: "Optical garden" },
  { id: "sample-prism", src: "/images/optical-archive/prism-lens-stilllife-v1.webp", name: "Prism notes" },
  { id: "sample-paper", src: "/images/optical-archive/paper-ripple-study-v1.webp", name: "Paper tide" },
  { id: "sample-darkroom", src: "/images/optical-archive/darkroom-light-table-v1.webp", name: "Darkroom herbarium" },
  { id: "sample-rain", src: "/images/optical-archive/rain-moon-gate-night-v1.webp", name: "Rain atlas" },
];

const modes: CompositionMode[] = ["filmstrip", "contact-sheet", "postcard", "moodboard"];
const paperColors = ["#fffaf0", "#f4e3b6", "#dfe7d8", "#e6b6a8", "#5b2438"];

export function CreativeStudioPage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [mode, setMode] = useState<CompositionMode>("filmstrip");
  const [images, setImages] = useState<CompositionImage[]>(sampleImages);
  const [title, setTitle] = useState("NHB / OPTICAL GARDEN");
  const [caption, setCaption] = useState("RAIN / GLASS / QUIET LIGHT");
  const [paperColor, setPaperColor] = useState(paperColors[0]);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState("");
  const inkColor = paperColor === "#5b2438" ? "#fffaf0" : "#203128";

  useSEO({ titleKey: "platform.studio.title", descKey: "platform.studio.description", path: "/studio" });

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => setRendered(false), [caption, images, mode, paperColor, title]);

  const imageCountLabel = useMemo(() => t("platform.studio.imageCount", { count: images.length }), [images.length, t]);

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 12 - images.length);
    if (!accepted.length) {
      setError(t("platform.studio.invalidFiles"));
      return;
    }
    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrlsRef.current.push(src);
      return { id: `${file.name}-${file.lastModified}-${file.size}`, src, name: file.name };
    });
    setImages((current) => [...current, ...additions].slice(0, 12));
    setError("");
    track("studio_images_added", { count: additions.length });
  };

  const resetSamples = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setImages(sampleImages);
    setError("");
  };

  const removeImage = (image: CompositionImage) => {
    if (image.src.startsWith("blob:")) {
      URL.revokeObjectURL(image.src);
      objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== image.src);
    }
    setImages((current) => current.filter((entry) => entry.id !== image.id));
  };

  const exportComposition = (format: "png" | "webp") => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nhb-${mode}-${Date.now()}.${format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      track("studio_export", { mode, format, imageCount: images.length });
    }, `image/${format}`, format === "webp" ? 0.92 : undefined);
  };

  const markRendered = useCallback(() => setRendered(true), []);

  return (
    <PageTransition className="platform-page studio-page">
      <header className="studio-heading">
        <div>
          <span className="platform-index">NHB / LOCAL CREATIVE STUDIO</span>
          <h1>{t("platform.studio.title")}</h1>
          <p>{t("platform.studio.description")}</p>
        </div>
        <PrefetchLink to="/editor" className="studio-darkroom-link"><Aperture size={19} aria-hidden="true" />{t("platform.studio.openDarkroom")}</PrefetchLink>
      </header>

      <div className="studio-workspace">
        <aside className="studio-controls" aria-label={t("platform.studio.controls") }>
          <section>
            <span className="studio-control-index">01 / FORMAT</span>
            <div className="studio-mode-control" role="group" aria-label={t("platform.studio.modeLabel")}>
              {modes.map((item) => (
                <button type="button" key={item} className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>
                  {t(`platform.studio.modes.${item}` as never)}
                </button>
              ))}
            </div>
          </section>

          <section>
            <span className="studio-control-index">02 / IMAGES</span>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
            <button
              type="button"
              className="studio-upload"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
            >
              <ImagePlus size={22} aria-hidden="true" />
              <span><strong>{t("platform.studio.addImages")}</strong><small>{imageCountLabel}</small></span>
            </button>
            <div className="studio-image-strip">
              {images.map((image) => (
                <div key={image.id} title={image.name}>
                  <img src={image.src} alt="" />
                  <button type="button" onClick={() => removeImage(image)} aria-label={`${t("common.remove", "Remove")} ${image.name}`}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="studio-reset" onClick={resetSamples}>{t("platform.studio.restoreSamples")}</button>
            {error ? <p className="studio-error" role="alert">{error}</p> : null}
          </section>

          <section>
            <span className="studio-control-index">03 / TYPE</span>
            <label><span>{t("platform.studio.titleLabel")}</span><input value={title} maxLength={44} onChange={(event) => setTitle(event.target.value)} /></label>
            <label><span>{t("platform.studio.captionLabel")}</span><input value={caption} maxLength={64} onChange={(event) => setCaption(event.target.value)} /></label>
          </section>

          <section>
            <span className="studio-control-index">04 / PAPER</span>
            <div className="studio-swatches" role="group" aria-label={t("platform.studio.paperLabel")}>
              {paperColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={paperColor === color ? "is-active" : ""}
                  style={{ backgroundColor: color }}
                  onClick={() => setPaperColor(color)}
                  aria-label={color}
                  aria-pressed={paperColor === color}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="studio-preview">
          <div className="studio-preview__bar"><span><Layers3 size={16} aria-hidden="true" /> {t(`platform.studio.modes.${mode}` as never)}</span><small>{imageCountLabel}</small></div>
          <div className={`studio-canvas-frame studio-canvas-frame--${mode}`}>
            <CompositionCanvas ref={canvasRef} mode={mode} images={images} title={title} caption={caption} paperColor={paperColor} inkColor={inkColor} onRendered={markRendered} />
          </div>
          <div className="studio-export-actions">
            <button type="button" onClick={() => exportComposition("png")} disabled={!rendered}><Download size={18} aria-hidden="true" /> PNG</button>
            <button type="button" onClick={() => exportComposition("webp")} disabled={!rendered}><FileImage size={18} aria-hidden="true" /> WebP</button>
            <span>{t("platform.studio.localOnly")}</span>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
