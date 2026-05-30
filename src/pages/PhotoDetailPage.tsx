import { useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, MapPin, Camera, Share2 } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { Section } from "../components/Section";
import type { PhotoItem } from "../types/photo";

const galleryThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/1200/${fileName}` : src;
};

const relatedThumb = (src: string) => {
  const base = src.replace(/\?.*$/, "");
  const fileName = base.split("/").pop();
  return fileName ? `/images/gallery/640/${fileName}` : src;
};

export function PhotoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const { photos } = usePublicPhotos();
  const lang = i18n.language;

  const photo = useMemo(() => photos.find((p) => p.id === id), [photos, id]);

  const relatedPhotos = useMemo(() => {
    if (!photo) return [];
    return photos
      .filter((p) => p.style === photo.style && p.id !== photo.id)
      .slice(0, 4);
  }, [photos, photo]);

  useSEO({
    title: photo?.title,
    descKey: "seo.photoDetailDesc",
    path: id ? `/gallery/${id}` : undefined,
  });

  useGsapPageEffects(rootRef);

  if (!id) {
    return <DetailNotFound message={t("photoDetail.notFound")} backTo="/gallery" backLabel={t("photoDetail.backToGallery")} />;
  }

  if (!photo) {
    return <DetailNotFound message={t("photoDetail.notFound")} backTo="/gallery" backLabel={t("photoDetail.backToGallery")} />;
  }

  const handleShare = async () => {
    const shareData = {
      title: photo.title,
      text: `${photo.title} — ${photo.location}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <PageTransition ref={rootRef}>
      <section className="hero" id="top" style={{ paddingTop: "var(--nav-h, 64px)" }}>
        <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
          <DetailBackLink to="/gallery" label={t("photoDetail.backToGallery")} />
          <h1>{photo.title}</h1>
        </div>
      </section>

      <section className="section-shell is-visible" style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
            <ImageWithFallback
              src={galleryThumb(photo.imageUrl)}
              alt={photo.alt}
              title={photo.title}
              tone="cream"
              priority={true}
              sizes="(max-width: 768px) 100vw, 960px"
            />
          </div>
        </div>
      </section>

      <section className="section-shell is-visible">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 999,
              fontSize: "0.85rem",
              fontWeight: 600,
            }}>
              <Camera size={14} />
              {t(`gallery.filters.${photo.style}`, photo.style)}
            </span>
            {photo.location && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.9rem",
                color: "var(--caramel-muted)",
              }}>
                <MapPin size={14} />
                {photo.location}
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "var(--card-bg, rgba(255,255,255,0.7))",
                border: "1px solid var(--border-subtle)",
                borderRadius: 999,
                fontSize: "0.85rem",
                color: "var(--caramel-muted)",
                cursor: "pointer",
              }}
              aria-label={t("gallery.share")}
            >
              <Share2 size={14} />
              {t("gallery.share")}
            </button>
          </div>

          <h2 style={{ marginBottom: 16 }}>{t("photoDetail.about")}</h2>
          <p style={{ lineHeight: 1.8, color: "var(--caramel-muted)" }}>
            {t("photoDetail.aboutDesc", { title: photo.title, style: t(`gallery.filters.${photo.style}`, photo.style) })}
          </p>
        </div>
      </section>

      <section className="section-shell is-visible" style={{ textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>{t("photoDetail.ctaTitle")}</h2>
          <p style={{ color: "var(--caramel-muted)", marginBottom: 24 }}>{t("photoDetail.ctaDesc")}</p>
          <Link
            to="/booking"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 32px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("photoDetail.bookSimilar")}
          </Link>
        </div>
      </section>

      {relatedPhotos.length > 0 && (
        <section className="section-shell is-visible">
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <h2 style={{ marginBottom: 24 }}>{t("photoDetail.related")}</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}>
              {relatedPhotos.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/gallery/${rp.id}`}
                  style={{
                    textDecoration: "none",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "var(--card-bg, rgba(255,255,255,0.7))",
                    border: "1px solid var(--border-subtle)",
                    transition: "transform 0.2s",
                  }}
                >
                  <div style={{ aspectRatio: "4/5", overflow: "hidden" }}>
                    <ImageWithFallback
                      src={relatedThumb(rp.imageUrl)}
                      alt={rp.alt}
                      title={rp.title}
                      tone="cream"
                      sizes="(max-width: 600px) 50vw, 240px"
                    />
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{rp.title}</h4>
                    <span style={{ fontSize: "0.8rem", color: "var(--caramel-muted)" }}>{rp.location}</span>
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
