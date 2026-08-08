import "../styles/pages.css";
import "../styles/editor.css";
import "../styles/darkroom-v2.css";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ImagePlus, ShieldCheck, Sparkles, Zap, Upload, SlidersHorizontal } from "lucide-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { useSEO } from "../hooks/useSEO";
import { useImmersiveAnchor } from "../experience/useImmersiveAnchor";
import { editorSampleAssets, opticalArchiveById, type OpticalArchiveAsset } from "../data/optical-archive";

const PhotoEditorWorkspace = lazy(() => import("./PhotoEditorWorkspace"));
const EDITOR_IMMERSIVE_IMAGES = [
  opticalArchiveById.darkroom.imageUrl,
  opticalArchiveById["color-glass"].imageUrl,
  opticalArchiveById["paper-ripple"].imageUrl,
];

function EditorStudioFallback() {
  const { t } = useTranslation();

  return (
    <div className="editor-studio-loading" role="status" aria-live="polite">
      <span>{t("editor.loadingStudio", "Loading editor workspace...")}</span>
    </div>
  );
}

export default function PhotoEditorPage() {
  const { t } = useTranslation();
  const [studioReady, setStudioReady] = useState(false);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [initialSample, setInitialSample] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });
  const immersiveAnchor = useImmersiveAnchor({
    id: "editor-entrance",
    preset: "editor",
    imageUrls: EDITOR_IMMERSIVE_IMAGES,
  });

  useEffect(() => {
    if (!studioReady) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [studioReady]);

  const openStudio = useCallback(() => {
    setInitialSample(null);
    setStudioReady(true);
  }, []);

  const handleUploadClick = useCallback(() => {
    uploadRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setInitialSample(null);
    setInitialFile(file);
    setStudioReady(true);
    event.target.value = "";
  }, []);

  const openSample = useCallback(async (asset: OpticalArchiveAsset) => {
    setSampleLoading(asset.id);
    setSampleError(false);
    try {
      const response = await fetch(asset.imageUrl);
      if (!response.ok) throw new Error(`Sample image returned ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], `${asset.id}.webp`, { type: blob.type || "image/webp" });
      setInitialSample(asset.id);
      setInitialFile(file);
      setStudioReady(true);
    } catch (error) {
      console.error("Editor sample failed to load:", error);
      setSampleError(true);
    } finally {
      setSampleLoading(null);
    }
  }, []);

  if (studioReady) {
    return (
      <Suspense fallback={<EditorStudioFallback />}>
        <PhotoEditorWorkspace
          initialFile={initialFile}
          skipInitialFaceDetection={Boolean(initialSample)}
        />
      </Suspense>
    );
  }

  return (
    <PageTransition>
      <ErrorBoundary>
        <div
          ref={immersiveAnchor}
          className="editor-root editor-light-shell"
          data-immersive-anchor="editor"
        >
          <header className="editor-header editor-header--light">
            <div>
              <span className="editor-header-kicker">LOCAL STUDIO / WORKING FILE</span>
              <h1>{t("editor.title")}</h1>
              <p>{t("editor.subtitle")}</p>
            </div>
            <div className="editor-toolbar editor-toolbar--light" aria-label={t("editor.toolbarPrimary")}>
              <button type="button" className="editor-btn editor-btn--primary" onClick={handleUploadClick}>
                <Upload size={17} aria-hidden="true" />
                <span>{t("editor.upload")}</span>
              </button>
              <button type="button" className="editor-btn" onClick={openStudio}>
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span>{t("editor.openEditor", "Open editor")}</span>
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          </header>

          <section className="editor-light-main editor-darkroom-entrance" aria-labelledby="editor-light-title">
            <div className="editor-darkroom-feature">
              <ImageWithFallback
                src={opticalArchiveById.darkroom.imageUrl}
                alt={t(opticalArchiveById.darkroom.altKey as never)}
                title={t("opticalArchive.sampleTitle")}
                tone="ink"
                priority
                sizes="(max-width: 900px) 100vw, 64vw"
                className="editor-darkroom-feature__image"
              />
              <div className="editor-darkroom-feature__copy">
                <span className="editor-empty-kicker">{t("editor.emptyKicker", "Local editing studio")}</span>
                <h2 id="editor-light-title">{t("editor.emptyTitle", "Open a portrait to start editing")}</h2>
                <p>{t("editor.emptyDesc", "The workspace stays light until a photo is added, then loads the face model only when needed.")}</p>
                <button type="button" className="editor-empty-upload" onClick={handleUploadClick}>
                  <ImagePlus size={18} aria-hidden="true" />
                  <span>{t("editor.upload")}</span>
                </button>
              </div>
              <span className="editor-darkroom-feature__index" aria-hidden="true">D / 01</span>
            </div>

            <div className="editor-sample-deck">
              <header className="editor-sample-deck__header">
                <div>
                  <span className="editor-empty-kicker">NHB / OPTICAL TEST STRIPS</span>
                  <h2>{t("opticalArchive.sampleTitle")}</h2>
                </div>
                <p>{t("opticalArchive.sampleHint")}</p>
              </header>
              <div className="editor-sample-grid">
                {editorSampleAssets.map((asset, index) => {
                  const isLoading = sampleLoading === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className="editor-sample-card"
                      data-editor-sample={asset.id}
                      disabled={Boolean(sampleLoading)}
                      onClick={() => void openSample(asset)}
                      aria-label={`${t("opticalArchive.useSample")}: ${t(asset.altKey as never)}`}
                    >
                      <ImageWithFallback
                        src={asset.imageUrl}
                        alt=""
                        title={t(asset.altKey as never)}
                        tone={index === 0 ? "ink" : index === 1 ? "rose" : "cream"}
                        sizes="(max-width: 680px) 86vw, 260px"
                        className="editor-sample-card__image"
                      />
                      <span className="editor-sample-card__meta">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{t(asset.altKey as never)}</strong>
                        <ArrowUpRight size={17} aria-hidden="true" />
                      </span>
                      {isLoading && <span className="editor-sample-card__loading">{t("editor.loadingImage")}</span>}
                    </button>
                  );
                })}
              </div>
              {sampleError && <p className="editor-sample-error" role="alert">{t("editor.imageLoadFailed")}</p>}
              <div className="editor-empty-badges" aria-label={t("editor.emptyBadgesLabel", "Editor loading notes")}>
                <span><ShieldCheck size={14} aria-hidden="true" />{t("editor.localOnly", "Your photo stays on this device")}</span>
                <span><Sparkles size={14} aria-hidden="true" />{t("editor.modelsDeferred", "AI models load only after you add a photo.")}</span>
                <span><Zap size={14} aria-hidden="true" />{t("editor.manualFallback", "Filters, text, and export stay available")}</span>
              </div>
            </div>
          </section>
        </div>
      </ErrorBoundary>
    </PageTransition>
  );
}
