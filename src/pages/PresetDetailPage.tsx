import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Star, Check } from "lucide-react";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailLoading } from "../components/shared/DetailLoading";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { getName, getDesc } from "../lib/i18n-helpers";
import type { Preset } from "../types/content";

export function PresetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [sliderPos, setSliderPos] = useState(50);
  const [allPresets, setAllPresets] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useGsapPageEffects(rootRef);

  const lang = i18n.language;

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/presets/${id}`, { signal: ctrl.signal }).then((r) => r.json()),
      fetch("/api/presets", { signal: ctrl.signal }).then((r) => r.json()),
    ])
      .then(([detail, list]) => {
        if (!ctrl.signal.aborted) {
          if (!detail.preset) { setError("not found"); }
          else { setPreset(detail.preset); setAllPresets((list.presets || []).filter((p: Preset) => p.id !== id)); }
        }
      })
      .catch(() => { if (!ctrl.signal.aborted) setError(t("common.loading")); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    try { await fetch(`/api/presets/${id}/download`, { method: "POST" }); }
    catch { /* silent */ }
  };

  if (loading) return <DetailLoading label={t("loading")} />;
  if (error || !preset) return <DetailNotFound message={t("presetDetail.notFound")} backTo="/products" backLabel={t("presetDetail.backToList")} />;

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/products" label={t("presetDetail.backToList")} />
          <p className="section-eyebrow">{t(`presets.categories.${preset.category}` as any)}</p>
          <h1>{getName(preset, lang)}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
            {preset.price_display && <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>{preset.price_display}</span>}
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={14} /> {preset.download_count} {t("presetDetail.downloads")}
            </span>
          </div>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {preset.preview_images && preset.preview_images.length > 0 && (
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", userSelect: "none" }}>
              <img src={preset.preview_images[0]} alt={getName(preset, lang)} style={{ width: "100%", display: "block" }} />
              <div style={{ position: "absolute", top: 0, left: 0, width: `${sliderPos}%`, height: "100%", overflow: "hidden" }}>
                <img src={preset.preview_images[0]} alt="" style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: "none", display: "block" }} />
              </div>
              <input
                type="range" min={0} max={100} value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "ew-resize" }}
              />
              <div style={{ position: "absolute", top: 0, left: `${sliderPos}%`, width: 2, height: "100%", background: "#fff", boxShadow: "0 0 8px rgba(0,0,0,0.3)", pointerEvents: "none", transform: "translateX(-50%)" }} />
              <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem" }}>{t("presetDetail.before")}</div>
              <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem" }}>{t("presetDetail.after")}</div>
            </div>
          )}
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("presetDetail.about")}</h2>
          <p style={{ lineHeight: 1.8, color: "var(--text-secondary)" }}>{getDesc(preset, lang)}</p>

          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3>{t("presetDetail.includes")}</h3>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {["Lightroom Desktop Presets (.xmp)", "Lightroom Mobile Presets (.dng)", "Lightroom Classic Presets", "Installation Guide (PDF)"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
                  <Check size={16} style={{ color: "var(--accent)", flexShrink: 0 }} /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3>{t("presetDetail.compatibility")}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Lightroom CC", "Lightroom Classic", "Lightroom Mobile", "Photoshop Camera Raw"].map((v) => (
                <span key={v} style={{ padding: "6px 14px", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: "0.85rem" }}>{v}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <a
              href={preset.download_url}
              onClick={handleDownload}
              target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "var(--accent)", color: "#fff", borderRadius: 999, textDecoration: "none", fontWeight: 600 }}
            >
              <Download size={16} /> {t("presetDetail.download")} {preset.price_display}
            </a>
          </div>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("presetDetail.reviews")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { name: "小林", text: "效果非常好，一键套用就很自然！胶片感很足。", stars: 5 },
              { name: "Amy", text: "Love the warm tones! Perfect for my autumn photos.", stars: 5 },
              { name: "Zoe", text: "日系清新预设太好用了，拍校园写真必备。", stars: 4 },
            ].map((r, i) => (
              <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {Array.from({ length: r.stars }).map((_, j) => (
                    <Star key={j} size={14} fill="var(--accent)" color="var(--accent)" />
                  ))}
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>{r.text}</p>
                <span style={{ fontSize: "0.8rem", color: "var(--caramel-muted)" }}>— {r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {allPresets.length > 0 && (
        <section className="section-shell is-visible">
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ marginBottom: 16 }}>{t("presetDetail.related")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {allPresets.slice(0, 3).map((p) => (
                <Link
                  key={p.id} to={`/presets/${p.id}`}
                  style={{ display: "block", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, overflow: "hidden", textDecoration: "none", color: "inherit" }}
                >
                  {p.preview_images?.[0] && <img src={p.preview_images[0]} alt={getName(p, lang)} style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />}
                  <div style={{ padding: 12 }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "0.9rem" }}>{getName(p, lang)}</h4>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{p.price_display}</span>
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
