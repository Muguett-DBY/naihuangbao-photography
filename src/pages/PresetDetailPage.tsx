import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Star, Check } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { CompareSlider } from "../components/CompareSlider";
import { PresetPreview } from "../components/PresetPreview";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Preset } from "../types/content";

export function PresetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPresets, setAllPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    async function loadPreset() {
      const listResponse = await fetch("/api/presets", { signal: ctrl.signal });
      const list = listResponse.ok ? await listResponse.json() : { presets: [] };
      const presets = (list.presets || []) as Preset[];
      const listPreset = presets.find((p) => p.id === id);

      if (!listPreset) {
        return { preset: null, presets };
      }

      const detailResponse = await fetch(`/api/presets/${id}`, { signal: ctrl.signal });
      const detail = detailResponse.ok ? await detailResponse.json() : { preset: listPreset };
      return { preset: (detail.preset || listPreset) as Preset, presets };
    }

    loadPreset()
      .then(({ preset, presets }) => {
        if (!ctrl.signal.aborted) {
          if (!preset) {
            setError("not found");
          } else {
            setPreset(preset);
            setAllPresets(presets.filter((p) => p.id !== id));
          }
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) setError(t("common.loading")); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  const presetTitle = preset ? getName(preset, lang) : "";
  useSEO({
    title: presetTitle,
    descKey: "seo.presetDetailDesc",
    path: id ? `/presets/${id}` : undefined,
  });

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
            <CompareSlider
              beforeSrc={preset.preview_images[0]}
              afterSrc={preset.preview_images[preset.preview_images.length > 1 ? 1 : 0]}
              beforeAlt={`${getName(preset, lang)} — ${t("compare.before")}`}
              afterAlt={`${getName(preset, lang)} — ${t("compare.after")}`}
            />
          )}
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.preview")}</h2>
          <PresetPreview presetId={id} />
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.about")}</h2>
          <p className="preset-detail-description">{getDesc(preset, lang)}</p>

          <div className="preset-detail-includes">
            <h3>{t("presetDetail.includes")}</h3>
            <ul>
              {(t("presetDetail.includesItems", { returnObjects: true }) as string[]).map((item) => (
                <li key={item}>
                  <Check size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="preset-detail-compatibility">
            <h3>{t("presetDetail.compatibility")}</h3>
            <div className="preset-detail-compatibility-tags">
              {(t("presetDetail.compatibilityTags", { returnObjects: true }) as string[]).map((v) => (
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
            {(t("presetDetail.presetReviews", { returnObjects: true }) as Array<{ name: string; text: string; stars: number }>).map((r, i) => (
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
