import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { DataState } from "../components/shared/DataState";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tMerchandiseCategory } from "../lib/i18n-typed";
import type { Merchandise } from "../types/content";

export function ShopPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, loading, error, retry, empty } = useApiList<Merchandise>("/api/merchandise", "merchandise");

  useSEO({ titleKey: "seo.shopTitle", descKey: "seo.shopDesc", path: "/shop" });
  useGsapPageEffects(rootRef);

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Shop"
        title={t("merchandise.title")}
        subtitle={t("merchandise.intro")}
      />

      <section className="section-shell is-visible">
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<ShoppingCart size={40} strokeWidth={1.2} />}
          emptyText={t("merchandise.empty")}
        >
          <div className="merchandise-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className="merchandise-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/shop/${item.id}`)}
              >
                {item.images && item.images[0] && (
                  <img src={item.images[0]} alt={getName(item, i18n.language)} className="merchandise-cover" loading="lazy" />
                )}
                <div className="merchandise-info">
                  <span className="merchandise-category">{tMerchandiseCategory(t, item.category)}</span>
                  <h3>{getName(item, i18n.language)}</h3>
                  <p>{getDesc(item, i18n.language)}</p>
                  <div className="merchandise-actions">
                    <span className="merchandise-price">{item.price_display}</span>
                    <button
                      className="merchandise-inquire-btn"
                      onClick={(e) => { e.stopPropagation(); openBookingModal(); }}
                    >
                      {t("merchandise.inquire")}
                    </button>
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
