import { Download, FileDown, FileImage, FolderOpen, ImagePlus, Layers3, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CompositionCanvas, type CompositionImage } from "../CompositionCanvas";
import {
  createCompositionProjectFile,
  createCompositionSnapshot,
  getCompositionProject,
  parseCompositionProjectFile,
  saveCompositionProject,
  type CompositionProjectSnapshot,
} from "../../lib/composition-project-store";
import type { CompositionMode } from "../../lib/composition-layout";
import { track } from "../../utils/track";

export const compositionSampleImages: CompositionImage[] = [
  { id: "sample-garden", src: "/images/optical-archive/conservatory-after-rain-v1.webp", name: "Morning conservatory" },
  { id: "sample-prism", src: "/images/optical-archive/glass-fern-caustics-v1.webp", name: "Tactile optics" },
  { id: "sample-paper", src: "/images/optical-archive/paper-water-lab-v1.webp", name: "Paper water lab" },
  { id: "sample-darkroom", src: "/images/optical-archive/print-room-morning-v2.webp", name: "Print room" },
  { id: "sample-rain", src: "/images/optical-archive/rain-observation-room-v1.webp", name: "Weather room" },
];

const modes: CompositionMode[] = ["filmstrip", "contact-sheet", "postcard", "moodboard"];
const paperColors = ["#fffaf0", "#f4e3b6", "#dfe7d8", "#e6b6a8", "#5b2438"];

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CompositionStudio({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [projectName, setProjectName] = useState("Optical Garden Study");
  const [mode, setMode] = useState<CompositionMode>("filmstrip");
  const [images, setImages] = useState<CompositionImage[]>(compositionSampleImages);
  const [title, setTitle] = useState("NHB / OPTICAL GARDEN");
  const [caption, setCaption] = useState("RAIN / GLASS / QUIET LIGHT");
  const [paperColor, setPaperColor] = useState(paperColors[0]);
  const [rendered, setRendered] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState("");
  const inkColor = paperColor === "#5b2438" ? "#fffaf0" : "#203128";

  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const applySnapshot = useCallback((snapshot: CompositionProjectSnapshot) => {
    revokeObjectUrls();
    const restoredImages = snapshot.images.map((image) => {
      if (!image.blob) return image;
      const src = URL.createObjectURL(image.blob);
      objectUrlsRef.current.push(src);
      return { ...image, src };
    });
    setProjectName(snapshot.name);
    setMode(snapshot.mode);
    setTitle(snapshot.title);
    setCaption(snapshot.caption);
    setPaperColor(snapshot.paperColor);
    setImages(restoredImages);
  }, [revokeObjectUrls]);

  useEffect(() => {
    let cancelled = false;
    void getCompositionProject()
      .then((snapshot) => {
        if (!cancelled && snapshot) applySnapshot(snapshot);
        if (!cancelled) setSaveStatus(snapshot ? "saved" : "saving");
      })
      .catch(() => { if (!cancelled) setSaveStatus("error"); })
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; revokeObjectUrls(); };
  }, [applySnapshot, revokeObjectUrls]);

  useEffect(() => setRendered(false), [caption, images, mode, paperColor, title]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      const snapshot = createCompositionSnapshot({ name: projectName, mode, title, caption, paperColor, images });
      void saveCompositionProject(snapshot)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [caption, hydrated, images, mode, paperColor, projectName, title]);

  const imageCountLabel = useMemo(() => t("platform.studio.imageCount", { count: images.length }), [images.length, t]);
  const markRendered = useCallback(() => setRendered(true), []);

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 12 - images.length);
    if (!accepted.length) {
      setError(t("platform.studio.invalidFiles"));
      return;
    }
    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrlsRef.current.push(src);
      return { id: `${file.name}-${file.lastModified}-${file.size}`, src, name: file.name, blob: file };
    });
    setImages((current) => [...current, ...additions].slice(0, 12));
    setError("");
    track("studio_images_added", { count: additions.length });
  };

  const resetSamples = () => {
    revokeObjectUrls();
    setImages(compositionSampleImages);
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
      downloadBlob(blob, `nhb-${mode}-${Date.now()}.${format}`);
      track("studio_export", { mode, format, imageCount: images.length });
    }, `image/${format}`, format === "webp" ? 0.92 : undefined);
  };

  const exportProject = async () => {
    const snapshot = createCompositionSnapshot({ name: projectName, mode, title, caption, paperColor, images });
    downloadBlob(await createCompositionProjectFile(snapshot), `${projectName.trim().replace(/\s+/g, "-").toLowerCase() || "nhb-project"}.nhb`);
    track("studio_project_export", { imageCount: images.length });
  };

  const importProject = async (file: File) => {
    try {
      const snapshot = await parseCompositionProjectFile(file);
      applySnapshot(snapshot);
      await saveCompositionProject(snapshot);
      setSaveStatus("saved");
      setError("");
      track("studio_project_import", { imageCount: snapshot.images.length });
    } catch {
      setError(t("platform.studio.invalidProject", "This NHB project could not be opened."));
    }
  };

  return (
    <div className={`studio-workspace${embedded ? " studio-workspace--embedded" : ""}`} data-create-workspace="composition">
      <aside className="studio-controls" aria-label={t("platform.studio.controls")}>
        <section className="studio-project-control">
          <span className="studio-control-index">00 / PROJECT</span>
          <label><span>{t("platform.studio.projectName", "Project name")}</span><input value={projectName} maxLength={48} onChange={(event) => setProjectName(event.target.value)} /></label>
          <div className="studio-project-actions">
            <input ref={projectInputRef} type="file" accept=".nhb,application/x-nhb-project+json" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importProject(file);
              event.currentTarget.value = "";
            }} />
            <button type="button" onClick={() => projectInputRef.current?.click()}><FolderOpen size={16} aria-hidden="true" />{t("platform.studio.importProject", "Open")}</button>
            <button type="button" onClick={() => void exportProject()}><FileDown size={16} aria-hidden="true" />{t("platform.studio.exportProject", "Save .nhb")}</button>
          </div>
          <p className={`studio-save-status is-${saveStatus}`} role="status">{t(`platform.studio.saveStatus.${saveStatus}` as never, saveStatus)}</p>
        </section>

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
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <button
            type="button"
            className="studio-upload"
            onClick={() => imageInputRef.current?.click()}
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
              <button type="button" key={color} className={paperColor === color ? "is-active" : ""} style={{ backgroundColor: color }} onClick={() => setPaperColor(color)} aria-label={color} aria-pressed={paperColor === color} />
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
  );
}
