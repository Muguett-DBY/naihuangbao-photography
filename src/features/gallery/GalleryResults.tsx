import type { CSSProperties, RefObject, TouchEvent } from "react";
import { Eye, Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CompareButton } from "../../components/CompareButton";
import { FavoriteButton } from "../../components/FavoriteButton";
import { GalleryExhibitionAtlas } from "../../components/GalleryExhibitionAtlas";
import { GalleryShareButton, GalleryVideoPreview } from "../../components/GalleryMediaControls";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { HighlightText } from "../../components/shared/HighlightText";
import { PrefetchLink } from "../../components/shared/PrefetchLink";
import { photoTransitionName } from "../../lib/photo-transition";
import type { PhotoItem } from "../../types/photo";
import { GALLERY_TONES, STYLE_FILTERS, type StyleFilter, type ViewMode } from "./gallery-discovery";

type GalleryResultsProps = {
  photos: PhotoItem[];
  visiblePhotos: PhotoItem[];
  viewMode: ViewMode;
  searchQuery: string;
  isTransitioning: boolean;
  isRemoteSyncing: boolean;
  touchedId: string | null;
  hasActiveDiscovery: boolean;
  hasMore: boolean;
  filterCounts: Record<StyleFilter, number>;
  photoIndexMap: Map<string, number>;
  masonryRef: RefObject<HTMLDivElement | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onReset: () => void;
  onEmptySuggestion: (style: StyleFilter) => void;
  onOpen: (photo: PhotoItem, source: "atlas" | "tap") => void;
  onQuickView: (photo: PhotoItem) => void;
  onTouchStart: (id: string, event: TouchEvent) => void;
  onHighlight: (kind: "hovered" | "focused", id: string | null) => void;
};

export function GalleryResults(props: GalleryResultsProps) {
  const { t } = useTranslation();
  const albumGroups = new Map<string, PhotoItem[]>();
  for (const photo of props.visiblePhotos) {
    const key = photo.album || t("gallery.otherAlbum");
    if (!albumGroups.has(key)) albumGroups.set(key, []);
    albumGroups.get(key)?.push(photo);
  }

  return (
    <div ref={props.masonryRef}>
      {props.photos.length === 0 && (
        <div className="gallery-empty-state" role="status" aria-live="polite">
          <span>{props.isRemoteSyncing ? t("gallery.loading") : t("gallery.noResults")}</span>
          <h3>{t("gallery.emptyTitle")}</h3>
          <p>{t("gallery.emptyDesc")}</p>
          {props.hasActiveDiscovery && (
            <div className="gallery-empty-suggestions">
              <span className="gallery-empty-suggestions-label">{t("gallery.tryFilters", "Try these styles:")}</span>
              <div className="gallery-empty-suggestions-row">
                {STYLE_FILTERS.filter((style) => style !== "all" && props.filterCounts[style] > 0).slice(0, 4).map((style) => (
                  <button key={style} type="button" className="gallery-empty-suggestion-btn" onClick={() => props.onEmptySuggestion(style)}>
                    {t(`gallery.filters.${style}`)}<span className="gallery-empty-suggestion-count">{props.filterCounts[style]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={props.onReset}>{t("gallery.emptyReset")}</button>
        </div>
      )}

      {props.photos.length > 0 && props.viewMode === "atlas" && <GalleryExhibitionAtlas photos={props.visiblePhotos} onOpen={(photo) => props.onOpen(photo, "atlas")} />}

      {props.photos.length > 0 && props.viewMode !== "atlas" && Array.from(albumGroups).map(([albumName, albumPhotos]) => (
        <div key={albumName} className="gallery-album">
          <div className="gallery-album-header">
            <h3 className="gallery-album-title">{albumName}</h3>
            <span className="gallery-album-count">{albumPhotos.length} {t("gallery.photos", "photos")}</span>
          </div>
          <div className={`gallery-masonry ${props.viewMode === "compact" ? "gallery-masonry--compact" : ""} ${props.viewMode === "contact" ? "gallery-masonry--contact" : ""} ${props.viewMode === "story" ? "gallery-masonry--story" : ""} ${props.isTransitioning ? "gallery-masonry--transitioning" : ""}`} data-gallery-view={props.viewMode}>
            {albumPhotos.map((item, index) => {
              const photoIndex = props.photoIndexMap.get(item.id) ?? 0;
              const isVideo = Boolean(item.videoUrl);
              return (
                <article
                  className={`gallery-masonry-item ${isVideo ? "is-video" : ""}${props.touchedId === item.id ? " is-touched" : ""}`}
                  data-gallery-photo-id={item.id}
                  key={item.id}
                  style={{ transitionDelay: `${index * 0.06}s` }}
                  onPointerEnter={() => props.onHighlight("hovered", item.id)}
                  onPointerLeave={() => props.onHighlight("hovered", null)}
                  onFocusCapture={() => props.onHighlight("focused", item.id)}
                  onBlurCapture={(event) => {
                    const next = event.relatedTarget;
                    if (!(next instanceof Node) || !event.currentTarget.contains(next)) props.onHighlight("focused", null);
                  }}
                >
                  <div
                    className="gallery-masonry-media"
                    style={{ "--gallery-loupe-image": `url("${item.imageUrl}")` } as CSSProperties}
                    onPointerMove={(event) => {
                      if (event.pointerType !== "mouse") return;
                      const bounds = event.currentTarget.getBoundingClientRect();
                      event.currentTarget.style.setProperty("--gallery-focus-x", `${((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 100}%`);
                      event.currentTarget.style.setProperty("--gallery-focus-y", `${((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 100}%`);
                    }}
                  >
                    <button className="gallery-masonry-btn" type="button" data-distort onClick={() => props.onOpen(item, "tap")} onTouchStart={(event) => props.onTouchStart(item.id, event)} aria-label={`${t("gallery.viewLargeImage")}${item.title}`}>
                      {isVideo && item.videoUrl ? <GalleryVideoPreview videoUrl={item.videoUrl} posterUrl={item.imageUrl || ""} title={item.title} /> : (
                        <ImageWithFallback src={item.imageUrl || ""} alt={item.alt} title={item.title} tone={GALLERY_TONES[photoIndex % GALLERY_TONES.length]} load priority={photoIndex < 6 || item.id === "gallery-daily-01"} sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw" transitionName={photoTransitionName(item.id)} />
                      )}
                      {isVideo && <span className="gallery-play-overlay" aria-hidden="true"><Play size={32} /></span>}
                      {item.featured && <span className="gallery-featured-badge" aria-label="Featured">⭐</span>}
                    </button>
                    <div className="gallery-masonry-overlay">
                      <span className="gallery-masonry-overlay-style">{t(`gallery.filters.${item.style}`, item.style)}</span>
                      <strong className="gallery-masonry-overlay-title"><HighlightText text={item.title} query={props.searchQuery} /></strong>
                      <span className="gallery-masonry-overlay-location"><HighlightText text={item.location} query={props.searchQuery} /></span>
                      <div className="gallery-masonry-overlay-actions">
                        <button type="button" className="gallery-quick-view-btn" onClick={(event) => { event.stopPropagation(); props.onQuickView(item); }} aria-label={`${t("quickView.label", "Quick view")} — ${item.title}`} title={t("quickView.label", "Quick view")}><Eye size={14} /></button>
                        <PrefetchLink to={`/gallery/${item.id}`} className="gallery-detail-link" onClick={(event) => event.stopPropagation()}>{t("gallery.viewDetails", "Details")} →</PrefetchLink>
                        <span onClick={(event) => event.stopPropagation()} role="presentation"><CompareButton variant="icon" entry={{ id: item.id, title: item.title, href: `/gallery/${item.id}`, imageUrl: item.imageUrl }} /></span>
                        <span onClick={(event) => event.stopPropagation()} role="presentation"><FavoriteButton variant="icon" entry={{ id: item.id, title: item.title, href: `/gallery/${item.id}`, imageUrl: item.imageUrl }} /></span>
                        <GalleryShareButton photo={item} />
                      </div>
                    </div>
                  </div>
                  <div className="gallery-masonry-caption">
                    <p>{t(`gallery.filters.${item.style}`, item.style)}</p>
                    <h3><HighlightText text={item.title} query={props.searchQuery} /></h3>
                    <span><HighlightText text={item.location} query={props.searchQuery} /></span>
                    {props.viewMode === "story" && <div className="gallery-story-note"><span>{String(photoIndex + 1).padStart(2, "0")} / {String(props.photos.length).padStart(2, "0")}</span><p>{item.alt || item.title}</p><PrefetchLink to={`/gallery/${item.id}`}>{t("gallery.enterStory", "Enter story")} →</PrefetchLink></div>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}

      {props.hasMore && <div ref={props.sentinelRef} className="gallery-loading-indicator"><Loader2 className="gallery-loading-spinner" size={24} /><span>{t("gallery.loading")}</span></div>}
      {!props.hasMore && props.photos.length > 0 && <div className="gallery-end-indicator"><span>{t("gallery.allLoaded", "All photos loaded")}</span></div>}
    </div>
  );
}
