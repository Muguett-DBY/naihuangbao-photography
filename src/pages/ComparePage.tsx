import "../styles/pages.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GitCompare, Layers, Repeat, X, Keyboard } from "lucide-react";
import { useCompare } from "../hooks/useCompare";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { CompareSlider } from "../components/CompareSlider";
import { useState, useEffect, useCallback } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSEO } from "../hooks/useSEO";

const fullSrc = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/960/${fileName}` : src;
};

export function ComparePage() {
  const { t } = useTranslation();
  const { entries, clear, remove } = useCompare();
  const [viewMode, setViewMode] = useState<"side-by-side" | "overlay">("side-by-side");
  const [swapped, setSwapped] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutDialogRef = useFocusTrap<HTMLDivElement>({ active: showShortcuts, initialFocus: "first" });

  useSEO({ titleKey: "photoCompare.title", descKey: "photoCompare.description", path: "/compare" });

  const photos = swapped ? [...entries].reverse() : entries;
  const hasBoth = entries.length === 2;

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => prev === "side-by-side" ? "overlay" : "side-by-side");
  }, []);

  const toggleSwap = useCallback(() => {
    setSwapped((prev) => !prev);
  }, []);

  const closeShortcuts = useCallback(() => {
    setShowShortcuts(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement
        || e.target instanceof HTMLTextAreaElement
        || e.target instanceof HTMLSelectElement
        || (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;

      if (showShortcuts) {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault();
          closeShortcuts();
        }
        return;
      }

      switch (e.key) {
        case "v":
          if (hasBoth) {
            e.preventDefault();
            toggleViewMode();
          }
          break;
        case "s":
          if (hasBoth) {
            e.preventDefault();
            toggleSwap();
          }
          break;
        case "Escape":
          if (entries.length > 0) {
            clear();
          }
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleViewMode, toggleSwap, clear, closeShortcuts, entries.length, hasBoth, showShortcuts]);

  return (
    <PageTransition className="compare-page compare-page--editorial">
      <header className="compare-page-header">
        <div className="compare-page-heading">
          <Link to="/gallery" className="compare-page-back">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("photoCompare.backToGallery")}
          </Link>
          <span className="compare-page-kicker">{t("photoCompare.eyebrow")}</span>
          <h1>
            <GitCompare size={22} aria-hidden="true" />
            {t("photoCompare.title")}
          </h1>
          <p>{t("photoCompare.description")}</p>
        </div>
        <div className="compare-page-actions">
          {hasBoth && (
            <>
              <div className="compare-page-mode-switch" role="group" aria-label={t("photoCompare.viewModeLabel")}>
                <button
                  type="button"
                  className="compare-page-mode-btn"
                  onClick={() => setViewMode("side-by-side")}
                  aria-pressed={viewMode === "side-by-side"}
                >
                  <GitCompare size={15} aria-hidden="true" />
                  {t("photoCompare.sideBySide")}
                </button>
                <button
                  type="button"
                  className="compare-page-mode-btn"
                  onClick={() => setViewMode("overlay")}
                  aria-pressed={viewMode === "overlay"}
                >
                  <Layers size={15} aria-hidden="true" />
                  {t("photoCompare.overlay")}
                </button>
              </div>
              <button
                type="button"
                className="compare-page-mode-btn"
                onClick={toggleSwap}
                aria-label={t("photoCompare.swap")}
              >
                <Repeat size={15} aria-hidden="true" />
                {t("photoCompare.swap")}
              </button>
            </>
          )}
          {entries.length > 0 && (
            <button type="button" className="compare-page-clear" onClick={clear}>
              <X size={15} aria-hidden="true" /> {t("photoCompare.clearAll")}
            </button>
          )}
          <button
            type="button"
            className="compare-page-shortcuts-btn"
            onClick={() => setShowShortcuts(true)}
            aria-label={t("photoCompare.keyboardShortcuts")}
            aria-expanded={showShortcuts}
          >
            <Keyboard size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {showShortcuts && (
        <div className="compare-page-dialog-backdrop" onMouseDown={closeShortcuts}>
          <div
            ref={shortcutDialogRef}
            className="compare-page-shortcuts"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-shortcuts-title"
            aria-describedby="compare-shortcuts-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="compare-page-shortcuts-heading">
              <div>
                <span>{t("photoCompare.shortcutEyebrow")}</span>
                <h2 id="compare-shortcuts-title">{t("photoCompare.keyboardShortcuts")}</h2>
              </div>
              <button type="button" onClick={closeShortcuts} aria-label={t("photoCompare.closeShortcuts")}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p id="compare-shortcuts-description">{t("photoCompare.shortcutDescription")}</p>
            <ul>
              <li><kbd>V</kbd> {t("photoCompare.shortcutToggleMode")}</li>
              <li><kbd>S</kbd> {t("photoCompare.shortcutSwap")}</li>
              <li><kbd>Esc</kbd> {t("photoCompare.shortcutClear")}</li>
              <li><kbd>?</kbd> {t("photoCompare.shortcutHelp")}</li>
            </ul>
          </div>
        </div>
      )}

      <main className="compare-page-stage">
        {entries.length === 0 ? (
          <div className="compare-page-empty">
          <GitCompare size={28} aria-hidden="true" />
          <h2>{t("photoCompare.emptyTitle")}</h2>
          <p>{t("photoCompare.empty")}</p>
          <Link to="/gallery" className="compare-page-cta">
            {t("photoCompare.browseGallery")}
          </Link>
        </div>
      ) : entries.length === 1 ? (
        <div className="compare-page-hint" role="status">
          {t("photoCompare.needTwo")}
        </div>
      ) : null}

      {hasBoth && viewMode === "overlay" ? (
        <div className="compare-page-overlay">
          <CompareSlider
            beforeSrc={fullSrc(photos[0].imageUrl ?? "")}
            afterSrc={fullSrc(photos[1].imageUrl ?? "")}
            beforeAlt={photos[0].title ?? photos[0].id}
            afterAlt={photos[1].title ?? photos[1].id}
          />
        </div>
      ) : (
        <div className="compare-page-grid">
          {photos.map((entry) => (
            <article key={entry.id} className="compare-page-card">
              <header className="compare-page-card-head">
                <Link to={entry.href} className="compare-page-card-title">
                  {entry.title ?? entry.id}
                </Link>
                <button
                  type="button"
                  className="compare-page-card-remove"
                  onClick={() => remove(entry.id)}
                  aria-label={t("photoCompare.removeOne")}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </header>
              <div className="compare-page-image-wrap">
                {entry.imageUrl ? (
                  <ImageWithFallback
                    src={fullSrc(entry.imageUrl)}
                    alt={entry.title ?? entry.id}
                    title={entry.title ?? entry.id}
                    tone="cream"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      </main>
    </PageTransition>
  );
}
