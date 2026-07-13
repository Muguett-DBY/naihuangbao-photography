import "../styles/pages.css";
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Package, Truck, RotateCcw, MessageCircle } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSEO } from "../hooks/useSEO";
import { useApiItem } from "../hooks/useApiItem";
import { useRelatedItems } from "../hooks/useRelatedItems";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tMerchandiseCategory } from "../lib/i18n-typed";
import type { Merchandise } from "../types/content";

export function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBookingModal();
  const { item, loading, error } = useApiItem<Merchandise>(id ? `/api/merchandise/${id}` : null);
  const { related: allItems } = useRelatedItems<Merchandise>("/api/merchandise", "merchandise", id);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [id]);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  const itemTitle = item ? getName(item, lang) : "";
  useSEO({
    title: itemTitle,
    descKey: "seo.shopDetailDesc",
    path: id ? `/shop/${id}` : undefined,
  });

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !item) return <DetailNotFound message={t("shopDetail.notFound")} backTo="/shop" backLabel={t("shopDetail.backToList")} />;

  const images = item.images || [];

  return (
    <PageTransition ref={rootRef} className="catalogue-detail-page catalogue-detail-page--shop">
      <header className="catalogue-detail-stage" id="top">
        <div className="catalogue-detail-media">
          {images.length > 0 ? (
            <>
              <div className="shop-detail-image-stage">
                <img
                  src={images[activeImage]}
                  alt={getName(item, lang)}
                  width={1000}
                  height={1000}
                  fetchPriority="high"
                  className="shop-detail-main-image"
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                      aria-label={t("shopDetail.previousImage")}
                      className="shop-detail-nav-btn shop-detail-nav-btn--prev"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImage((activeImage + 1) % images.length)}
                      aria-label={t("shopDetail.nextImage")}
                      className="shop-detail-nav-btn shop-detail-nav-btn--next"
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="shop-detail-thumbnails">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={() => setActiveImage(index)}
                      aria-label={t("shopDetail.viewImage", { index: index + 1 })}
                      aria-current={activeImage === index ? "true" : undefined}
                      className={`shop-detail-thumb${activeImage === index ? " shop-detail-thumb--active" : ""}`}
                    >
                      <img src={image} alt="" width={120} height={120} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="catalogue-detail-media-placeholder">
              <Package size={44} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="catalogue-detail-summary">
          <DetailBackLink to="/shop" label={t("shopDetail.backToList")} />
          <span className="catalogue-detail-marker">OBJECT / {item.available > 0 ? "AVAILABLE" : "ARCHIVED"}</span>
          <p className="section-eyebrow">{tMerchandiseCategory(t, item.category)}</p>
          <h1>{getName(item, lang)}</h1>
          <p className="catalogue-detail-description">{getDesc(item, lang)}</p>
          {item.price_display && <strong className="catalogue-detail-price">{item.price_display}</strong>}
          <span className={`merchandise-stock ${item.available > 0 ? "in-stock" : "out-of-stock"}`}>
            {item.available > 0 ? t("shopDetail.inStock") : t("shopDetail.outOfStock")}
          </span>
          <button type="button" onClick={() => openBookingModal()} className="shop-detail-inquire-btn">
            <MessageCircle size={16} aria-hidden="true" /> {t("merchandise.inquire")}
          </button>
        </div>
      </header>

      <ErrorBoundary>
      <section className="section-shell catalogue-detail-band is-visible">
        <div className="shop-detail-grid">
          <div className="shop-detail-about">
            <div className="shop-detail-specs">
              <h3>{t("shopDetail.specs")}</h3>
              <div className="shop-detail-specs-grid">
                {[
                  { label: t("shopDetail.specCategory"), value: tMerchandiseCategory(t, item.category) },
                  { label: t("shopDetail.specPrice"), value: item.price_display },
                  { label: t("shopDetail.specAvailability"), value: item.available ? t("shopDetail.inStock") : t("shopDetail.outOfStock") },
                ].map((spec) => (
                  <div key={spec.label} className="shop-detail-spec-item">
                    <span className="shop-detail-spec-label">{spec.label}</span>
                    <span className="shop-detail-spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="shop-detail-guide">
              <h3>{t("shopDetail.guide")}</h3>
              {[
                { icon: <MessageCircle size={16} />, text: t("shopDetail.step1") },
                { icon: <Package size={16} />, text: t("shopDetail.step2") },
                { icon: <Truck size={16} />, text: t("shopDetail.step3") },
                { icon: <RotateCcw size={16} />, text: t("shopDetail.step4") },
              ].map((step, i) => (
                <div key={i} className="shop-detail-guide-step">
                  <span>{step.icon}</span> {step.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {allItems.length > 0 && (
        <section className="section-shell catalogue-detail-band is-visible">
          <div className="shop-detail-related">
            <h2>{t("shopDetail.related")}</h2>
            <div className="shop-detail-related-grid">
              {allItems.slice(0, 4).map((m) => (
                <Link key={m.id} to={`/shop/${m.id}`}
                  className="shop-detail-related-card">
                  {m.images?.[0] && <img src={m.images[0]} alt={getName(m, lang)} />}
                  <div className="shop-detail-related-card-info">
                    <h4>{getName(m, lang)}</h4>
                    <span>{m.price_display}</span>
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
