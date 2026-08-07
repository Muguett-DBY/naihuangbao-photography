import "../styles/pages.css";
import { useRef, useState, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { usePageRevealEffects } from "../hooks/usePageRevealEffects";
import { useBookingModal } from "../features/booking/BookingContext";
import { useSEO } from "../hooks/useSEO";
import { useApiList } from "../hooks/useApiList";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHero } from "../components/shared/PageHero";
import { CatalogueCardMedia } from "../components/shared/CatalogueCardMedia";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DataState } from "../components/shared/DataState";
import { getName, getDesc } from "../lib/i18n-helpers";
import { tMerchandiseCategory } from "../lib/i18n-typed";
import { selectImmersiveImageUrls } from "../experience/immersive-images";
import { useImmersiveHighlight } from "../experience/useImmersiveHighlight";
import type { Merchandise } from "../types/content";

type CategoryFilter = string | "all";

export function ShopPage() {
  const { t, i18n } = useTranslation();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, loading, error, retry, empty } = useApiList<Merchandise>("/api/merchandise", "merchandise");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const bindImmersiveHighlight = useImmersiveHighlight();

  useSEO({ titleKey: "seo.shopTitle", descKey: "seo.shopDesc", path: "/shop" });
  usePageRevealEffects(rootRef);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    items.forEach((item) => cats.set(item.category, (cats.get(item.category) || 0) + 1));
    return Array.from(cats.entries());
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.category === filter);
  }, [items, filter]);
  const merchandiseImageUrls = useMemo(() => selectImmersiveImageUrls([
    ...items.flatMap((item) => item.images ?? []),
    "/images/gallery/gallery-daily-01.webp",
  ]), [items]);

  return (
    <PageTransition ref={rootRef} className="catalogue-page catalogue-page--shop">
      <PageHero
        eyebrow="Shop"
        title={t("merchandise.title")}
        subtitle={t("merchandise.intro")}
        image="/images/gallery/gallery-daily-01.webp"
        imageAlt={t("merchandise.title")}
        issue="ISSUE 06"
        immersivePreset="shop"
        immersiveImages={merchandiseImageUrls}
      />

      <section className="section-shell catalogue-section is-visible">
        <ErrorBoundary>
        <DataState
          loading={loading}
          error={error}
          empty={empty}
          retry={retry}
          icon={<ShoppingCart size={40} strokeWidth={1.2} />}
          emptyText={t("merchandise.empty")}
        >
          <header className="catalogue-section-heading">
            <span>OBJECT ARCHIVE / {String(filteredItems.length).padStart(2, "0")}</span>
            <p>{t("merchandise.intro")}</p>
          </header>
          {categories.length > 1 && (
            <div className="filter-row catalogue-toolbar" role="group" aria-label={t("merchandise.title")}>
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
            {filteredItems.map((item, index) => (
              <article key={item.id} className="merchandise-card catalogue-card" {...bindImmersiveHighlight(item.id)}>
                <Link to={`/shop/${item.id}`} className="catalogue-card-link">
                  <span className="catalogue-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <CatalogueCardMedia
                    alt={getName(item, i18n.language)}
                    className="merchandise-cover-wrap"
                    imageClassName="merchandise-cover"
                    imageUrl={item.images?.[0]}
                    index={index}
                    kind="object"
                  >
                    <span className="merchandise-cover-badge">{tMerchandiseCategory(t, item.category)}</span>
                  </CatalogueCardMedia>
                  <div className="merchandise-info catalogue-card-copy">
                    <span className="course-category">{tMerchandiseCategory(t, item.category)}</span>
                    <h3>{getName(item, i18n.language)}</h3>
                    <p>{getDesc(item, i18n.language)}</p>
                  </div>
                </Link>
                <footer className="merchandise-actions catalogue-card-actions">
                  <span className="merchandise-price">{item.price_display}</span>
                  <span className={`merchandise-stock ${item.available > 0 ? "in-stock" : "out-of-stock"}`}>
                    {item.available > 0
                      ? t("merchandise.inStock")
                      : t("merchandise.outOfStock")}
                  </span>
                  <button
                    type="button"
                    className="merchandise-inquire-btn"
                    onClick={() => openBookingModal()}
                    disabled={item.available <= 0}
                  >
                    {t("merchandise.inquire")}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </DataState>
        </ErrorBoundary>
      </section>
    </PageTransition>
  );
}
