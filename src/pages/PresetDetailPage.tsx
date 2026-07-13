import "../styles/pages.css";
import { useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Star, Check } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useSEO } from "../hooks/useSEO";
import { useApiItem } from "../hooks/useApiItem";
import { useRelatedItems } from "../hooks/useRelatedItems";
import { useJsonLd } from "../hooks/useJsonLd";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { CompareSlider } from "../components/CompareSlider";
import { PresetPreview } from "../components/PresetPreview";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tPresetCategory } from "../lib/i18n-typed";
import { siteOrigin } from "../lib/site-origin";
import { publicMutationHeaders } from "../lib/admin-helpers";
import type { Preset } from "../types/content";

export function PresetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { item: preset, loading, error } = useApiItem<Preset>(id ? `/api/presets/${id}` : null);
  const { related: allPresets } = useRelatedItems<Preset>("/api/presets", "presets", id);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  const presetTitle = preset ? getName(preset, lang) : "";
  useSEO({
    title: presetTitle,
    descKey: "seo.presetDetailDesc",
    path: id ? `/presets/${id}` : undefined,
  });

  const productJsonLd = useMemo(() => {
    if (!preset) return null;
    const priceMatch = preset.price_display?.match(/(\d+(?:\.\d+)?)/);
    const price = priceMatch ? priceMatch[1] : "0";
    const images = (preset.preview_images || []).slice(0, 4).map((img) =>
      `${siteOrigin}${img.replace(/\?.*$/, "")}`,
    );
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${siteOrigin}/presets/${preset.id}#product`,
      name: getName(preset, lang),
      description: getDesc(preset, lang) || presetTitle,
      image: images,
      url: `${siteOrigin}/presets/${preset.id}`,
      brand: { "@type": "Brand", name: "Naihuangbao Photography" },
      category: preset.category,
      offers: {
        "@type": "Offer",
        priceCurrency: "CNY",
        price,
        availability: preset.download_url ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        url: `${siteOrigin}/presets/${preset.id}`,
        seller: { "@type": "Organization", name: "Naihuangbao Photography" },
      },
    };
  }, [preset, lang, presetTitle]);

  useJsonLd({
    id: preset ? `preset-${preset.id}` : "preset-empty",
    data: productJsonLd ?? {},
  });

  const breadcrumb = useMemo(() => {
    if (!preset) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteOrigin}/` },
        { "@type": "ListItem", position: 2, name: "Presets", item: `${siteOrigin}/products` },
        { "@type": "ListItem", position: 3, name: presetTitle, item: `${siteOrigin}/presets/${preset.id}` },
      ],
    };
  }, [preset, presetTitle]);

  useJsonLd({
    id: preset ? `preset-breadcrumb-${preset.id}` : "preset-breadcrumb-empty",
    data: breadcrumb ?? {},
  });

  const handleDownload = () => {
    if (!id) return;
    void fetch(`/api/presets/${id}/download`, {
      method: "POST",
      headers: publicMutationHeaders,
      keepalive: true,
    }).catch(() => undefined);
  };

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !preset) return <DetailNotFound message={t("presetDetail.notFound")} backTo="/products" backLabel={t("presetDetail.backToList")} />;

  return (
    <PageTransition ref={rootRef} className="catalogue-detail-page catalogue-detail-page--preset">
      <header className="catalogue-detail-stage" id="top">
        <div className="catalogue-detail-media catalogue-detail-media--compare">
          {preset.preview_images?.length ? (
            <CompareSlider
              beforeSrc={preset.preview_images[0]}
              afterSrc={preset.preview_images[preset.preview_images.length > 1 ? 1 : 0]}
              beforeAlt={`${getName(preset, lang)} — ${t("compare.before")}`}
              afterAlt={`${getName(preset, lang)} — ${t("compare.after")}`}
            />
          ) : (
            <div className="catalogue-detail-media-placeholder">
              <Download size={44} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="catalogue-detail-summary">
          <DetailBackLink to="/products" label={t("presetDetail.backToList")} />
          <span className="catalogue-detail-marker">PRESET / DIGITAL</span>
          <p className="section-eyebrow">{tPresetCategory(t, preset.category)}</p>
          <h1>{getName(preset, lang)}</h1>
          <p className="catalogue-detail-description">{getDesc(preset, lang)}</p>
          <div className="preset-detail-hero-meta">
            {preset.price_display && <span className="preset-detail-hero-price">{preset.price_display}</span>}
            <span className="preset-detail-hero-downloads">
              <Download size={14} aria-hidden="true" /> {preset.download_count} {t("presetDetail.downloads")}
            </span>
          </div>
          {preset.download_url ? (
            <a
              href={preset.download_url}
              onClick={handleDownload}
              target="_blank"
              rel="noreferrer"
              className="preset-detail-download-btn"
            >
              <Download size={16} aria-hidden="true" /> {t("presetDetail.download")} {preset.price_display}
            </a>
          ) : (
            <button type="button" className="preset-detail-download-btn" disabled>
              <Download size={16} aria-hidden="true" /> {t("presets.unavailable")}
            </button>
          )}
        </div>
      </header>

      <ErrorBoundary>
      <section className="section-shell catalogue-detail-band is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.preview")}</h2>
          <PresetPreview presetId={id} />
        </div>
      </section>

      <section className="section-shell catalogue-detail-band is-visible">
        <div className="preset-detail-section">
          <h2>{t("presetDetail.about")}</h2>

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

        </div>
      </section>

      <section className="section-shell catalogue-detail-band is-visible">
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
        <section className="section-shell catalogue-detail-band is-visible">
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
      </ErrorBoundary>
    </PageTransition>
  );
}
