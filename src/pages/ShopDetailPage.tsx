import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Package, Truck, RotateCcw, MessageCircle } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Merchandise } from "../types/content";

export function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBookingModal();
  const [item, setItem] = useState<Merchandise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [allItems, setAllItems] = useState<Merchandise[]>([]);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/merchandise/${id}`, { signal: ctrl.signal }).then((r) => r.json()),
      fetch("/api/merchandise", { signal: ctrl.signal }).then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        if (!ctrl.signal.aborted) {
          if (!detail.merchandise) { setError("not found"); }
          else { setItem(detail.merchandise); setAllItems((list.merchandise || []).filter((m: Merchandise) => m.id !== id)); }
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) setError(t("common.loading")); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !item) return <DetailNotFound message={t("shopDetail.notFound")} backTo="/shop" backLabel={t("shopDetail.backToList")} />;

  const images = item.images || [];

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/shop" label={t("shopDetail.backToList")} />
          <p className="section-eyebrow">{t(`merchandise.categories.${item.category}` as any)}</p>
          <h1>{getName(item, lang)}</h1>
          {item.price_display && <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: 8 }}>{item.price_display}</div>}
        </div>
      </section>

      <section className="section-shell is-visible">
        <div className="shop-detail-grid">
          <div>
            {images.length > 0 && (
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
                <img src={images[activeImage]} alt={getName(item, lang)} width={800} height={800} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                      aria-label="Previous image"
                      style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setActiveImage((activeImage + 1) % images.length)}
                      aria-label="Next image"
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={activeImage === i ? "true" : undefined}
                    style={{ flex: 1, border: activeImage === i ? "2px solid var(--accent)" : "2px solid transparent", borderRadius: 8, overflow: "hidden", cursor: "pointer", padding: 0, background: "none" }}>
                    <img src={img} alt="" width={120} height={120} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: 16 }}>{t("shopDetail.about")}</h2>
            <p style={{ lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 24 }}>{getDesc(item, lang)}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <h3>{t("shopDetail.specs")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: t("shopDetail.specCategory"), value: t(`merchandise.categories.${item.category}` as any) },
                  { label: t("shopDetail.specPrice"), value: item.price_display },
                  { label: t("shopDetail.specAvailability"), value: item.available ? t("shopDetail.inStock") : t("shopDetail.outOfStock") },
                ].map((spec) => (
                  <div key={spec.label} style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>{spec.label}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <h3>{t("shopDetail.guide")}</h3>
              {[
                { icon: <MessageCircle size={16} />, text: t("shopDetail.step1") },
                { icon: <Package size={16} />, text: t("shopDetail.step2") },
                { icon: <Truck size={16} />, text: t("shopDetail.step3") },
                { icon: <RotateCcw size={16} />, text: t("shopDetail.step4") },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--accent)" }}>{step.icon}</span> {step.text}
                </div>
              ))}
            </div>

            <button onClick={() => openBookingModal()}
              style={{ width: "100%", padding: "12px 24px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 999, fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <MessageCircle size={16} /> {t("merchandise.inquire")}
            </button>
          </div>
        </div>
      </section>

      {allItems.length > 0 && (
        <section className="section-shell is-visible">
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ marginBottom: 16 }}>{t("shopDetail.related")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
              {allItems.slice(0, 4).map((m) => (
                <Link key={m.id} to={`/shop/${m.id}`}
                  style={{ display: "block", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, overflow: "hidden", textDecoration: "none", color: "inherit" }}>
                  {m.images?.[0] && <img src={m.images[0]} alt={getName(m, lang)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />}
                  <div style={{ padding: 10 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>{getName(m, lang)}</h4>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{m.price_display}</span>
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
