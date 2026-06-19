import "../styles/pages.css";
import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DataState } from "../components/shared/DataState";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tMerchandiseCategory } from "../lib/i18n-typed";
import type { Merchandise } from "../types/content";

type CategoryFilter = string | "all";

export function ShopPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, loading, error, retry, empty } = useApiList<Merchandise>("/api/merchandise", "merchandise");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  useSEO({ titleKey: "seo.shopTitle", descKey: "seo.shopDesc", path: "/shop" });
  useGsapPageEffects(rootRef);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    items.forEach((item) => cats.set(item.category, (cats.get(item.category) || 0) + 1));
    return Array.from(cats.entries());
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.category === filter);
  }, [items, filter]);

  return (
    <PageTransition ref={rootRef}>
      <PageHero
        eyebrow="Shop"
        title={t("merchandise.title")}
        subtitle={t("merchandise.intro")}
      />

      <section className="section-shell is-visible">
        <ErrorBoundary>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<ShoppingCart size={40} strokeWidth={1.2} />}
          emptyText={t("merchandise.empty")}
        >
          {categories.length > 1 && (
            <div className="filter-row" role="group" aria-label={t("merchandise.title")}>
              <button
                type="button"
                aria-pressed={filter === "all"}
                className={filter === "all" ? "is-active" : ""}
                onClick={() => setFilter("all")}
              >
                {t("gallery.filters.all")}
                <span className="filter-count">{items.length}</span>
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={filter === cat}
                  className={filter === cat ? "is-active" : ""}
                  onClick={() => setFilter(cat)}
                >
                  {tMerchandiseCategory(t, cat)}
                  <span className="filter-count">{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="merchandise-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="merchandise-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/shop/${item.id}`)}
              >
                {item.images && item.images[0] ? (
                  <div className="merchandise-cover-wrap">
                    <img src={item.images[0]} alt={getName(item, i18n.language)} className="merchandise-cover" loading="lazy" />
                    <span className="merchandise-cover-badge">{tMerchandiseCategory(t, item.category)}</span>
                  </div>
                ) : (
                  <div className="merchandise-cover-placeholder">
                    <ShoppingCart size={32} />
                  </div>
                )}
                <div className="merchandise-info">
                  <h3>{getName(item, i18n.language)}</h3>
                  <p>{getDesc(item, i18n.language)}</p>
                  <div className="merchandise-actions">
                    <span className="merchandise-price">{item.price_display}</span>
                    {item.available > 0 ? (
                      <span className="merchandise-stock in-stock">{t("merchandise.inStock", "In Stock")}</span>
                    ) : (
                      <span className="merchandise-stock out-of-stock">{t("merchandise.outOfStock", "Sold Out")}</span>
                    )}
                    <button
                      className="merchandise-inquire-btn"
                      onClick={(e) => { e.stopPropagation(); openBookingModal(); }}
                      disabled={item.available <= 0}
                    >
                      {t("merchandise.inquire")}
                    </button>
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
