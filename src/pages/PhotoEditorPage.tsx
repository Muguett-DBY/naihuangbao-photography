import "../styles/pages.css";
import { lazy, Suspense, useCallback, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, ShieldCheck, Sparkles, Zap, Upload, SlidersHorizontal } from "lucide-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PageTransition } from "../components/shared/PageTransition";
import { useSEO } from "../hooks/useSEO";

const PhotoEditorWorkspace = lazy(() => import("./PhotoEditorWorkspace"));

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
  const uploadRef = useRef<HTMLInputElement>(null);

  useSEO({ titleKey: "editor.title", descKey: "editor.desc", path: "/editor" });

  const openStudio = useCallback(() => {
    setStudioReady(true);
  }, []);

  const handleUploadClick = useCallback(() => {
    uploadRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setInitialFile(file);
    setStudioReady(true);
    event.target.value = "";
  }, []);

  if (studioReady) {
    return (
      <Suspense fallback={<EditorStudioFallback />}>
        <PhotoEditorWorkspace initialFile={initialFile} />
      </Suspense>
    );
  }

  return (
    <PageTransition>
      <ErrorBoundary>
        <div className="editor-root editor-light-shell">
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

          <section className="editor-light-main" aria-labelledby="editor-light-title">
            <div className="editor-canvas--empty">
              <div className="editor-empty-panel">
                <span className="editor-empty-kicker">{t("editor.emptyKicker", "Local editing studio")}</span>
                <h2 id="editor-light-title">{t("editor.emptyTitle", "Open a portrait to start editing")}</h2>
                <p>{t("editor.emptyDesc", "The workspace stays light until a photo is added, then loads the face model only when needed.")}</p>
                <button type="button" className="editor-empty-upload" onClick={handleUploadClick}>
                  <ImagePlus size={18} aria-hidden="true" />
                  <span>{t("editor.upload")}</span>
                </button>
                <div className="editor-empty-badges" aria-label={t("editor.emptyBadgesLabel", "Editor loading notes")}>
                  <span><ShieldCheck size={14} aria-hidden="true" />{t("editor.localOnly", "Your photo stays on this device")}</span>
                  <span><Sparkles size={14} aria-hidden="true" />{t("editor.modelsDeferred", "AI models load only after you add a photo.")}</span>
                  <span><Zap size={14} aria-hidden="true" />{t("editor.manualFallback", "Filters, text, and export stay available")}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ErrorBoundary>
    </PageTransition>
  );
}
