import "../styles/pages.css";
import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, ArrowRight, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { useSEO } from "../hooks/useSEO";
import { useGsapPageEffects } from "../hooks/useGsapPageEffects";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useJsonLd } from "../hooks/useJsonLd";
import { useHreflang } from "../hooks/useHreflang";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { PageTransition } from "../components/shared/PageTransition";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { DetailNotFound } from "../components/shared/DetailNotFound";
import { DetailBackLink } from "../components/shared/DetailBackLink";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RecentlyViewedStrip } from "../components/RecentlyViewedStrip";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareMenu } from "../components/ShareMenu";
import { PinchZoom } from "../components/PinchZoom";
import { siteOrigin } from "../lib/site-origin";
import type { PhotoItem } from "../types/photo";

const CompareSlider = lazy(() =>
  import("../components/CompareSlider").then((m) => ({ default: m.CompareSlider }))
);

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
  const [showComparison, setShowComparison] = useState(false);

  const photo = useMemo(() => photos.find((p) => p.id === id), [photos, id]);
  const { recordVisit, entries: recentlyViewed, clear: clearRecentlyViewed } = useRecentlyViewed();
  const navigate = useNavigate();

  // Adjacent photos for swipe navigation
  const adjacent = useMemo(() => {
    if (!photo) return { prev: null as PhotoItem | null, next: null as PhotoItem | null };
    const idx = photos.findIndex((p) => p.id === photo.id);
    return {
      prev: idx > 0 ? photos[idx - 1] ?? null : null,
      next: idx >= 0 && idx < photos.length - 1 ? photos[idx + 1] ?? null : null,
    };
  }, [photos, photo]);

  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => { if (adjacent.next) navigate(`/gallery/${adjacent.next.id}`); },
    onSwipeRight: () => { if (adjacent.prev) navigate(`/gallery/${adjacent.prev.id}`); },
  });

  useEffect(() => {
    if (!photo) return;
    recordVisit({
      id: photo.id,
      title: photo.title,
      href: `/gallery/${photo.id}`,
      imageUrl: photo.imageUrl,
    });
  }, [photo, recordVisit]);

  const relatedPhotos = useMemo(() => {
    if (!photo) return [];
    // Prioritize same album, then same style
    const sameAlbum = photos.filter((p) => p.album === photo.album && p.id !== photo.id);
    const sameStyle = photos.filter((p) => p.style === photo.style && p.id !== photo.id && p.album !== photo.album);
    return [...sameAlbum, ...sameStyle].slice(0, 4);
  }, [photos, photo]);

  const imageObject = useMemo(() => {
    if (!photo) return null;
    const cleanImageUrl = photo.imageUrl.replace(/\?.*$/, "");
    return {
      "@context": "https://schema.org",
      "@type": "Photograph",
      "@id": `${siteOrigin}/gallery/${photo.id}#photograph`,
      name: photo.title,
      description: photo.alt || photo.title,
      contentUrl: `${siteOrigin}${cleanImageUrl}`,
      url: `${siteOrigin}/gallery/${photo.id}`,
      thumbnailUrl: `${siteOrigin}/images/gallery/640/${cleanImageUrl.split("/").pop()}`,
      creator: {
        "@type": "Person",
        name: "Naihuangbao Photography",
      },
      copyrightHolder: {
        "@type": "Organization",
        name: "Naihuangbao Photography",
      },
      keywords: [photo.style, photo.location, photo.album].filter(Boolean).join(", "),
      contentLocation: {
        "@type": "Place",
        name: photo.location,
      },
      isPartOf: {
        "@type": "ImageGallery",
        name: "Naihuangbao Photography Portfolio",
        url: `${siteOrigin}/gallery`,
      },
    };
  }, [photo]);

  useJsonLd({
    id: photo ? `photo-${photo.id}` : "photo-empty",
    data: imageObject ?? {},
    removeOnUnmount: true,
  });

  const breadcrumb = useMemo(() => {
    if (!photo) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteOrigin}/` },
        { "@type": "ListItem", position: 2, name: "Gallery", item: `${siteOrigin}/gallery` },
        { "@type": "ListItem", position: 3, name: photo.title, item: `${siteOrigin}/gallery/${photo.id}` },
      ],
    };
  }, [photo]);

  useJsonLd({
    id: photo ? `photo-breadcrumb-${photo.id}` : "photo-breadcrumb-empty",
    data: breadcrumb ?? {},
    removeOnUnmount: true,
  });

  useSEO({
    title: photo?.title,
    descKey: "seo.photoDetailDesc",
    path: id ? `/gallery/${id}` : undefined,
    image: photo?.imageUrl
      ? `${siteOrigin}${photo.imageUrl.replace(/\?.*$/, "")}`
      : undefined,
    imageAlt: photo?.alt || photo?.title,
  });

  useHreflang({ path: id ? `/gallery/${id}` : "/gallery" });

  useGsapPageEffects(rootRef);

  if (!id) {
    return <DetailNotFound message={t("photoDetail.notFound")} backTo="/gallery" backLabel={t("photoDetail.backToGallery")} />;
  }

  if (!photo) {
    return <DetailNotFound message={t("photoDetail.notFound")} backTo="/gallery" backLabel={t("photoDetail.backToGallery")} />;
  }

  const beforeSrc = photo.imageUrl;
  const afterSrc = galleryThumb(photo.imageUrl);
  const hasComparison = beforeSrc !== afterSrc;

  return (
    <PageTransition ref={rootRef}>
      <section className="photo-detail-hero" id="top">
        <div className="photo-detail-heading">
          <DetailBackLink to="/gallery" label={t("photoDetail.backToGallery")} />
          <h1>{photo.title}</h1>
        </div>
        <div className="photo-detail-cover-shell" ref={swipeRef}>
          {(adjacent.prev || adjacent.next) && (
            <div className="photo-detail-nav-hint" aria-hidden="true">
              {adjacent.prev && (
                <span className="photo-detail-nav-arrow photo-detail-nav-arrow--prev">
                  <ChevronLeft size={18} />
                </span>
              )}
              {adjacent.next && (
                <span className="photo-detail-nav-arrow photo-detail-nav-arrow--next">
                  <ChevronRight size={18} />
                </span>
              )}
            </div>
          )}
          <PinchZoom className="photo-detail-cover-frame">
            <ImageWithFallback
              src={galleryThumb(photo.imageUrl)}
              alt={photo.alt}
              title={photo.title}
              tone="cream"
              priority={true}
              sizes="(max-width: 768px) 100vw, 960px"
            />
          </PinchZoom>
        </div>
        {(adjacent.prev || adjacent.next) && (
          <nav className="photo-detail-adjacent" aria-label={t("photoDetail.adjacentNav", "Adjacent photos")}>
            {adjacent.prev ? (
              <Link to={`/gallery/${adjacent.prev.id}`} className="photo-detail-adjacent-link photo-detail-adjacent-link--prev">
                <ChevronLeft size={16} />
                <span>{adjacent.prev.title}</span>
              </Link>
            ) : <span />}
            {adjacent.next ? (
              <Link to={`/gallery/${adjacent.next.id}`} className="photo-detail-adjacent-link photo-detail-adjacent-link--next">
                <span>{adjacent.next.title}</span>
                <ChevronRight size={16} />
              </Link>
            ) : <span />}
          </nav>
        )}
      </section>

      <ErrorBoundary>
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
            <ShareMenu
              variant="pill"
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={photo.title}
              text={`${photo.title} — ${photo.location}`}
            />
            <FavoriteButton
              entry={{
                id: photo.id,
                title: photo.title,
                href: `/gallery/${photo.id}`,
                imageUrl: photo.imageUrl,
              }}
            />
          </div>

          <h2>{t("photoDetail.about")}</h2>
          <p>
            {t("photoDetail.aboutDesc", { title: photo.title, style: t(`gallery.filters.${photo.style}`, photo.style) })}
          </p>

          {/* Photo details grid */}
          <div className="photo-detail-info-grid">
            <div className="photo-detail-info-item">
              <span className="photo-detail-info-label">{t("photoDetail.style")}</span>
              <span className="photo-detail-info-value">{t(`gallery.filters.${photo.style}`, photo.style)}</span>
            </div>
            {photo.location && (
              <div className="photo-detail-info-item">
                <span className="photo-detail-info-label">{t("photoDetail.location")}</span>
                <span className="photo-detail-info-value">{photo.location}</span>
              </div>
            )}
            {photo.album && (
              <div className="photo-detail-info-item">
                <span className="photo-detail-info-label">{t("photoDetail.album")}</span>
                <span className="photo-detail-info-value">{photo.album}</span>
              </div>
            )}
          </div>

          {/* Before/After comparison */}
          {hasComparison && (
            <div className="photo-detail-comparison">
              <h3>{t("photoDetail.beforeAfter")}</h3>
              <p className="photo-detail-comparison-desc">{t("photoDetail.comparisonDesc")}</p>
              <div className="photo-detail-comparison-toggle">
                <button
                  type="button"
                  className={`photo-detail-comparison-btn ${!showComparison ? "active" : ""}`}
                  onClick={() => setShowComparison(false)}
                >
                  <Eye size={14} />
                  {t("photoDetail.original")}
                </button>
                <button
                  type="button"
                  className={`photo-detail-comparison-btn ${showComparison ? "active" : ""}`}
                  onClick={() => setShowComparison(true)}
                >
                  <Eye size={14} />
                  {t("photoDetail.edited")}
                </button>
              </div>
              <div className="photo-detail-comparison-container">
                <CompareSlider
                  beforeSrc={beforeSrc}
                  afterSrc={afterSrc}
                  beforeAlt={`${photo.title} — ${t("compare.before")}`}
                  afterAlt={`${photo.title} — ${t("compare.after")}`}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section-shell is-visible photo-detail-cta">
        <div className="photo-detail-cta-inner">
          <h2>{t("photoDetail.ctaTitle")}</h2>
          <p>{t("photoDetail.ctaDesc")}</p>
          <Link to="/booking" className="photo-detail-cta-link">
            {t("photoDetail.bookSimilar")}
            <ArrowRight size={18} />
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

      <RecentlyViewedStrip currentId={photo.id} />
      </ErrorBoundary>
    </PageTransition>
  );
}
