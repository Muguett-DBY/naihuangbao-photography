import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, Package, Truck, RotateCcw, MessageCircle } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useBookingModal } from "../hooks/useBookingModal";
import { PageTransition } from "../components/shared/PageTransition";
import type { Merchandise } from "../types/content";

export function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBookingModal();
  const [item, setItem] = useState<Merchandise | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [allItems, setAllItems] = useState<Merchandise[]>([]);

  useGsapPageEffects(rootRef);

  const lang = i18n.language.split("-")[0];

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    Promise.all([
      fetch(`/api/merchandise/${id}`, { signal: ctrl.signal }).then((r) => r.json()),
      fetch("/api/merchandise", { signal: ctrl.signal }).then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        if (!ctrl.signal.aborted) {
          setItem(detail.merchandise || null);
          setAllItems((list.merchandise || []).filter((m: Merchandise) => m.id !== id));
        }
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  const getName = (m: Merchandise) => {
    if (lang === "en" && m.name_en) return m.name_en;
    if (lang === "ko" && m.name_ko) return m.name_ko;
    if (lang === "ja" && m.name_ja) return m.name_ja;
    return m.name;
  };

  const getDesc = (m: Merchandise) => {
    if (lang === "en" && m.description_en) return m.description_en;
    if (lang === "ko" && m.description_ko) return m.description_ko;
    if (lang === "ja" && m.description_ja) return m.description_ja;
    return m.description;
  };

  if (loading) {
    return (
      <PageTransition ref={rootRef}>
        <div style={{ textAlign: "center", padding: 120 }}>{t("loading")}</div>
      </PageTransition>
    );
  }

  if (!item) {
    return (
      <PageTransition ref={rootRef}>
        <div style={{ textAlign: "center", padding: 120 }}>
          <h2>{t("shopDetail.notFound")}</h2>
          <Link to="/shop" style={{ color: "var(--accent)" }}>{t("shopDetail.backToList")}</Link>
        </div>
      </PageTransition>
    );
  }

  const images = item.images || [];

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <Link to="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)", marginBottom: 16, fontSize: "0.9rem" }}>
            <ArrowLeft size={16} /> {t("shopDetail.backToList")}
          </Link>
          <p className="section-eyebrow">{t(`merchandise.categories.${item.category}` as any)}</p>
          <h1>{getName(item)}</h1>
          {item.price_display && (
            <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: 8 }}>{item.price_display}</div>
          )}
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {images.length > 0 && (
              <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
                <img
                  src={images[activeImage]}
                  alt={getName(item)}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                      style={{
                        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                        width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)",
                        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setActiveImage((activeImage + 1) % images.length)}
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)",
                        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    style={{
                      flex: 1,
                      border: activeImage === i ? "2px solid var(--accent)" : "2px solid transparent",
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      background: "none",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: 16 }}>{t("shopDetail.about")}</h2>
            <p style={{ lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 24 }}>{getDesc(item)}</p>

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
                  <span style={{ color: "var(--accent)" }}>{step.icon}</span>
                  {step.text}
                </div>
              ))}
            </div>

            <button
              onClick={() => openBookingModal()}
              style={{
                width: "100%",
                padding: "12px 24px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
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
                <Link
                  key={m.id}
                  to={`/shop/${m.id}`}
                  style={{
                    display: "block",
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {m.images?.[0] && (
                    <img src={m.images[0]} alt={getName(m)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                  )}
                  <div style={{ padding: 10 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "0.85rem" }}>{getName(m)}</h4>
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
