import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Preset } from "../types/content";

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({ titleKey: "seo.presetsTitle", descKey: "seo.presetsDesc", path: "/products" });
  useGsapPageEffects(rootRef);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/presets", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { presets: Preset[] }) => { if (!ctrl.signal.aborted) setPresets(d.presets || []); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  const handleDownload = async (id: string) => {
    await fetch(`/api/presets/${id}/download`, { method: "POST" });
  };

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">Presets</p>
          <h1>{t("presets.title")}</h1>
          <span>{t("presets.intro")}</span>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : presets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("presets.empty")}</p>
          </div>
        ) : (
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
                  <span className="preset-category">{t(`presets.categories.${preset.category}` as any)}</span>
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
        )}
      </section>
    </PageTransition>
  );
}
