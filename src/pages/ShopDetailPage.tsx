import { useRef, useState } from "react";
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
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading shop-detail-hero-heading">
          <DetailBackLink to="/shop" label={t("shopDetail.backToList")} />
          <p className="section-eyebrow">{tMerchandiseCategory(t, item.category)}</p>
          <h1>{getName(item, lang)}</h1>
          {item.price_display && <div className="shop-detail-price">{item.price_display}</div>}
        </div>
      </section>

      <ErrorBoundary>
      <section className="section-shell is-visible">
        <div className="shop-detail-grid">
          <div>
            {images.length > 0 && (
              <div className="shop-detail-image-stage">
                <img src={images[activeImage]} alt={getName(item, lang)} width={800} height={800} loading="lazy" className="shop-detail-main-image" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                      aria-label="Previous image"
                      className="shop-detail-nav-btn shop-detail-nav-btn--prev">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setActiveImage((activeImage + 1) % images.length)}
                      aria-label="Next image"
                      className="shop-detail-nav-btn shop-detail-nav-btn--next">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div className="shop-detail-thumbnails">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={activeImage === i ? "true" : undefined}
                    className={`shop-detail-thumb${activeImage === i ? " shop-detail-thumb--active" : ""}`}>
                    <img src={img} alt="" width={120} height={120} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="shop-detail-about">
            <h2>{t("shopDetail.about")}</h2>
            <p className="shop-detail-description">{getDesc(item, lang)}</p>

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

            <button onClick={() => openBookingModal()}
              className="shop-detail-inquire-btn">
              <MessageCircle size={16} /> {t("merchandise.inquire")}
            </button>
          </div>
        </div>
      </section>

      {allItems.length > 0 && (
        <section className="section-shell is-visible">
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
