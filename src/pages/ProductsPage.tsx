import "../styles/pages.css";
import { useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DataState } from "../components/shared/DataState";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tPresetCategory } from "../lib/i18n-typed";
import { publicMutationHeaders } from "../lib/admin-helpers";
import type { Preset } from "../types/content";

type CategoryFilter = string | "all";

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: presets, loading, error, retry, empty } = useApiList<Preset>("/api/presets", "presets");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  useSEO({ titleKey: "seo.presetsTitle", descKey: "seo.presetsDesc", path: "/products" });
  useGsapPageEffects(rootRef);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    presets.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  }, [presets]);

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    if (filter === "all") return presets;
    return presets.filter((p) => p.category === filter);
  }, [presets, filter]);

  const handleDownload = (id: string) => {
    void fetch(`/api/presets/${id}/download`, {
      method: "POST",
      headers: publicMutationHeaders,
      keepalive: true,
    }).catch(() => undefined);
  };

  return (
    <PageTransition ref={rootRef} className="catalogue-page catalogue-page--presets">
      <PageHero
        eyebrow="Presets"
        title={t("presets.title")}
        subtitle={t("presets.intro")}
        image="/images/gallery/gallery-urban-01.webp"
        imageAlt={t("presets.title")}
        issue="ISSUE 04"
      />

      <section className="section-shell catalogue-section is-visible">
        <ErrorBoundary>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<Download size={40} strokeWidth={1.2} />}
          emptyText={t("presets.empty")}
        >
          <header className="catalogue-section-heading">
            <span>PRESET ARCHIVE / {String(filteredPresets.length).padStart(2, "0")}</span>
            <p>{t("presets.intro")}</p>
          </header>
          {categories.length > 1 && (
            <div className="filter-row catalogue-toolbar" role="group" aria-label={t("presets.title")}>
              <button
                type="button"
                aria-pressed={filter === "all"}
                className={filter === "all" ? "is-active" : ""}
                onClick={() => setFilter("all")}
              >
                {t("gallery.filters.all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={filter === cat}
                  className={filter === cat ? "is-active" : ""}
                  onClick={() => setFilter(cat)}
                >
                  {tPresetCategory(t, cat)}
                </button>
              ))}
            </div>
          )}

          <div className="presets-grid">
            {filteredPresets.map((preset, index) => (
              <article key={preset.id} className="preset-card catalogue-card">
                <Link to={`/presets/${preset.id}`} className="catalogue-card-link">
                  <span className="catalogue-card-index">{String(index + 1).padStart(2, "0")}</span>
                  {preset.preview_images?.[0] ? (
                    <div className="preset-cover-wrap catalogue-card-media">
                      <img src={preset.preview_images[0]} alt={getName(preset, i18n.language)} className="preset-cover" loading="lazy" />
                      <span className="preset-cover-badge">{tPresetCategory(t, preset.category)}</span>
                      {preset.download_count != null && (
                        <span className="preset-download-count">
                          <Download size={12} aria-hidden="true" /> {preset.download_count}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="preset-cover-placeholder catalogue-card-media">
                      <Download size={32} aria-hidden="true" />
                    </div>
                  )}
                  <div className="preset-info catalogue-card-copy">
                    <span className="course-category">{tPresetCategory(t, preset.category)}</span>
                    <h3>{getName(preset, i18n.language)}</h3>
                    <p>{getDesc(preset, i18n.language)}</p>
                  </div>
                </Link>
                <footer className="preset-actions catalogue-card-actions">
                  <span className="preset-price">{preset.price_display}</span>
                  {preset.download_url ? (
                    <a
                      href={preset.download_url}
                      className="preset-download-btn"
                      onClick={() => handleDownload(preset.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={15} aria-hidden="true" /> {t("presets.download")}
                    </a>
                  ) : (
                    <button type="button" className="preset-download-btn" disabled>
                      <Download size={15} aria-hidden="true" /> {t("presets.unavailable")}
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        </DataState>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
