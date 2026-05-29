import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { useSEO } from "../hooks/useSEO";
import { PageTransition } from "../components/shared/PageTransition";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Merchandise } from "../types/content";

export function ShopPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openBookingModal } = useBookingModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({ titleKey: "seo.shopTitle", descKey: "seo.shopDesc", path: "/shop" });
  useGsapPageEffects(rootRef);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/merchandise", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { merchandise: Merchandise[] }) => { if (!ctrl.signal.aborted) setItems(d.merchandise || []); })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <p className="section-eyebrow">Shop</p>
          <h1>{t("merchandise.title")}</h1>
          <span>{t("merchandise.intro")}</span>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("merchandise.empty")}</p>
          </div>
        ) : (
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
                  <span className="merchandise-category">{t(`merchandise.categories.${item.category}` as any)}</span>
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
        )}
      </section>
    </PageTransition>
  );
}
