import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Star, Check } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Preset } from "../types/content";

export function PresetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [sliderPos, setSliderPos] = useState(50);
  const [allPresets, setAllPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/presets/${id}`, { signal: ctrl.signal }).then((r) => r.json()),
      fetch("/api/presets", { signal: ctrl.signal }).then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        if (!ctrl.signal.aborted) {
          if (!detail.preset) { setError("not found"); }
          else { setPreset(detail.preset); setAllPresets((list.presets || []).filter((p: Preset) => p.id !== id)); }
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) setError(t("common.loading")); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try { await fetch(`/api/presets/${id}/download`, { method: "POST" }); }
    catch { /* silent */ }
  };

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !preset) return <DetailNotFound message={t("presetDetail.notFound")} backTo="/products" backLabel={t("presetDetail.backToList")} />;

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading preset-detail-hero-heading">
          <DetailBackLink to="/products" label={t("presetDetail.backToList")} />
          <p className="section-eyebrow">{t(`presets.categories.${preset.category}` as any)}</p>
          <h1>{getName(preset, lang)}</h1>
          <div className="preset-detail-hero-meta">
            {preset.price_display && <span className="preset-detail-hero-price">{preset.price_display}</span>}
            <span className="preset-detail-hero-downloads">
              <Download size={14} /> {preset.download_count} {t("presetDetail.downloads")}
            </span>
          </div>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="preset-detail-section">
          {preset.preview_images && preset.preview_images.length > 0 && (
            <div className="preset-detail-compare">
              <img src={preset.preview_images[0]} alt={getName(preset, lang)} width={800} height={450} loading="lazy" className="preset-detail-compare-base" />
              <div className="preset-detail-compare-overlay" style={{ width: `${sliderPos}%` }}>
                <img src={preset.preview_images[0]} alt="" width={800} height={450} style={{ width: `${100 / (sliderPos / 100)}%` }} />
              </div>
              <input
                type="range" min={0} max={100} value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="preset-detail-compare-slider"
              />
              <div className="preset-detail-compare-line" style={{ left: `${sliderPos}%` }} />
              <div className="preset-detail-compare-label preset-detail-compare-label--before">{t("presetDetail.before")}</div>
              <div className="preset-detail-compare-label preset-detail-compare-label--after">{t("presetDetail.after")}</div>
            </div>
          )}
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.about")}</h2>
          <p className="preset-detail-description">{getDesc(preset, lang)}</p>

          <div className="preset-detail-includes">
            <h3>{t("presetDetail.includes")}</h3>
            <ul>
              {["Lightroom Desktop Presets (.xmp)", "Lightroom Mobile Presets (.dng)", "Lightroom Classic Presets", "Installation Guide (PDF)"].map((item) => (
                <li key={item}>
                  <Check size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="preset-detail-compatibility">
            <h3>{t("presetDetail.compatibility")}</h3>
            <div className="preset-detail-compatibility-tags">
              {["Lightroom CC", "Lightroom Classic", "Lightroom Mobile", "Photoshop Camera Raw"].map((v) => (
                <span key={v} className="preset-detail-compatibility-tag">{v}</span>
              ))}
            </div>
          </div>

          <a
            href={preset.download_url}
            onClick={handleDownload}
            target="_blank" rel="noreferrer"
            className="preset-detail-download-btn"
          >
            <Download size={16} /> {t("presetDetail.download")} {preset.price_display}
          </a>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.reviews")}</h2>
          <div className="preset-detail-reviews">
            {[
              { name: "小林", text: "效果非常好，一键套用就很自然！胶片感很足。", stars: 5 },
              { name: "Amy", text: "Love the warm tones! Perfect for my autumn photos.", stars: 5 },
              { name: "Zoe", text: "日系清新预设太好用了，拍校园写真必备。", stars: 4 },
            ].map((r, i) => (
              <div key={i} className="preset-detail-review-item">
                <div className="preset-detail-review-stars">
                  {Array.from({ length: r.stars }).map((_, j) => (
                    <Star key={j} size={14} fill="var(--accent)" color="var(--accent)" />
                  ))}
                </div>
                <p className="preset-detail-review-text">{r.text}</p>
                <span className="preset-detail-review-author">— {r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {allPresets.length > 0 && (
        <section className="section-shell is-visible">
          <div className="preset-detail-related">
            <h2>{t("presetDetail.related")}</h2>
            <div className="preset-detail-related-grid">
              {allPresets.slice(0, 3).map((p) => (
                <Link
                  key={p.id} to={`/presets/${p.id}`}
                  className="preset-detail-related-card"
                >
                  {p.preview_images?.[0] && <img src={p.preview_images[0]} alt={getName(p, lang)} />}
                  <div className="preset-detail-related-card-info">
                    <h4>{getName(p, lang)}</h4>
                    <span>{p.price_display}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
