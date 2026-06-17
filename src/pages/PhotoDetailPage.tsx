import { useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, Share2 } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { PageTransition } from "../components/shared/PageTransition";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { ImageWithFallback } from "../components/ImageWithFallback";
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
      <section className="photo-detail-hero" id="top">
        <div className="photo-detail-heading">
          <DetailBackLink to="/gallery" label={t("photoDetail.backToGallery")} />
          <h1>{photo.title}</h1>
        </div>
        <div className="photo-detail-cover-shell">
          <div className="photo-detail-cover-frame">
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
        <div className="photo-detail-content">
          <div className="photo-detail-meta">
            <span className="photo-detail-style-badge">
              <Camera size={14} />
              {t(`gallery.filters.${photo.style}`, photo.style)}
            </span>
            {photo.location && (
              <span className="photo-detail-location">
                <MapPin size={14} />
                {photo.location}
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="photo-detail-share-btn"
              aria-label={t("gallery.share")}
            >
              <Share2 size={14} />
              {t("gallery.share")}
            </button>
          </div>

          <h2>{t("photoDetail.about")}</h2>
          <p>
            {t("photoDetail.aboutDesc", { title: photo.title, style: t(`gallery.filters.${photo.style}`, photo.style) })}
          </p>
        </div>
      </section>

      <section className="section-shell is-visible photo-detail-cta">
        <div className="photo-detail-cta-inner">
          <h2>{t("photoDetail.ctaTitle")}</h2>
          <p>{t("photoDetail.ctaDesc")}</p>
          <Link to="/booking" className="photo-detail-cta-link">
            {t("photoDetail.bookSimilar")}
          </Link>
        </div>
      </section>

      {relatedPhotos.length > 0 && (
        <section className="section-shell is-visible">
          <div className="photo-detail-related">
            <h2>{t("photoDetail.related")}</h2>
            <div className="photo-detail-related-grid">
              {relatedPhotos.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/gallery/${rp.id}`}
                  className="photo-detail-related-card"
                >
                  <div className="photo-detail-related-thumb">
                    <ImageWithFallback
                      src={relatedThumb(rp.imageUrl)}
                      alt={rp.alt}
                      title={rp.title}
                      tone="cream"
                      sizes="(max-width: 600px) 50vw, 240px"
                    />
                  </div>
                  <div className="photo-detail-related-info">
                    <h4>{rp.title}</h4>
                    <span>{rp.location}</span>
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
