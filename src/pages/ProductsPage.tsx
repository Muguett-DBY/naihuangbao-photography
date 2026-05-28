import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import type { Preset } from "../types/content";

export function ProductsPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

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
          <span className="section-eyebrow">Presets</span>
          <h1>{t("presets.title")}</h1>
          <p>{t("presets.intro")}</p>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : presets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("presets.intro")}</p>
            <p style={{ opacity: 0.6, marginTop: 12 }}>预设资源即将上线，敬请期待</p>
          </div>
        ) : (
          <div className="presets-grid">
            {presets.map((preset) => (
              <div key={preset.id} className="preset-card">
                {preset.preview_images && preset.preview_images[0] && (
                  <img src={preset.preview_images[0]} alt={preset.name} className="preset-cover" />
                )}
                <div className="preset-info">
                  <span className="preset-category">{t(`presets.categories.${preset.category}` as any)}</span>
                  <h3>{preset.name}</h3>
                  <p>{preset.description}</p>
                  <div className="preset-actions">
                    <span className="preset-price">{preset.price_display}</span>
                    <a
                      href={preset.download_url}
                      className="preset-download-btn"
                      onClick={() => handleDownload(preset.id)}
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
