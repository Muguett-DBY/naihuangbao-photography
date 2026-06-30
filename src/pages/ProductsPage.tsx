import "../styles/pages.css";
import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  const handleDownload = async (id: string) => {
    await fetch(`/api/presets/${id}/download`, { method: "POST", headers: publicMutationHeaders });
  };

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Presets"
        title={t("presets.title")}
        subtitle={t("presets.intro")}
      />

      <section className="section-shell is-visible">
        <ErrorBoundary>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<Download size={40} strokeWidth={1.2} />}
          emptyText={t("presets.empty")}
        >
          {categories.length > 1 && (
            <div className="filter-row" role="group" aria-label={t("presets.title")}>
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
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="preset-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/presets/${preset.id}`)}
              >
                {preset.preview_images && preset.preview_images[0] && (
                  <div className="preset-cover-wrap">
                    <img src={preset.preview_images[0]} alt={getName(preset, i18n.language)} className="preset-cover" loading="lazy" />
                    <span className="preset-cover-badge">{tPresetCategory(t, preset.category)}</span>
                    {preset.download_count != null && (
                      <span className="preset-download-count">
                        <Download size={11} /> {preset.download_count}
                      </span>
                    )}
                  </div>
                )}
                <div className="preset-info">
                  <h3>{getName(preset, i18n.language)}</h3>
                  <p>{getDesc(preset, i18n.language)}</p>
                  <div className="preset-actions">
                    <span className="preset-price">{preset.price_display}</span>
                    <a
                      href={preset.download_url}
                      className="preset-download-btn"
                      onClick={(e) => { e.stopPropagation(); handleDownload(preset.id); }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} /> {t("presets.download")}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataState>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
