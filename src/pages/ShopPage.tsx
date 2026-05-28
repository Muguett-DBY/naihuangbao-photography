import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import type { Merchandise } from "../types/content";

export function ShopPage() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);

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
          <span className="section-eyebrow">Shop</span>
          <h1>{t("merchandise.title")}</h1>
          <p>{t("merchandise.intro")}</p>
        </div>
      </section>

      <section className="section-shell is-visible">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>{t("loading")}</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p>{t("merchandise.intro")}</p>
            <p style={{ opacity: 0.6, marginTop: 12 }}>周边产品即将上线，敬请期待</p>
          </div>
        ) : (
          <div className="merchandise-grid">
            {items.map((item) => (
              <div key={item.id} className="merchandise-card">
                {item.images && item.images[0] && (
                  <img src={item.images[0]} alt={item.name} className="merchandise-cover" />
                )}
                <div className="merchandise-info">
                  <span className="merchandise-category">{t(`merchandise.categories.${item.category}` as any)}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="merchandise-actions">
                    <span className="merchandise-price">{item.price_display}</span>
                    <a href="mailto:contact@example.com" className="merchandise-inquire-btn">
                      {t("merchandise.inquire")}
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
