import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { DataState } from "../components/shared/DataState";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tPresetCategory } from "../lib/i18n-typed";
import type { Preset } from "../types/content";

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items: presets, loading, error, retry, empty } = useApiList<Preset>("/api/presets", "presets");

  useSEO({ titleKey: "seo.presetsTitle", descKey: "seo.presetsDesc", path: "/products" });
  useGsapPageEffects(rootRef);

  const handleDownload = async (id: string) => {
    await fetch(`/api/presets/${id}/download`, { method: "POST" });
  };

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Presets"
        title={t("presets.title")}
        subtitle={t("presets.intro")}
      />

      <section className="section-shell is-visible">
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<Download size={40} strokeWidth={1.2} />}
          emptyText={t("presets.empty")}
        >
          <div className="presets-grid">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="preset-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/presets/${preset.id}`)}
              >
                {preset.preview_images && preset.preview_images[0] && (
                  <img src={preset.preview_images[0]} alt={getName(preset, i18n.language)} className="preset-cover" loading="lazy" />
                )}
                <div className="preset-info">
                  <span className="preset-category">{tPresetCategory(t, preset.category)}</span>
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
      </section>
    </PageTransition>
  );
}
