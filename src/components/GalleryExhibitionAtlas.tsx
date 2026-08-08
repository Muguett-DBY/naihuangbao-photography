import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { opticalArchiveById } from "../data/optical-archive";
import { buildExhibitionStops } from "../lib/gallery-exhibition";
import type { PhotoItem } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";

export function GalleryExhibitionAtlas({
  photos,
  onOpen,
}: {
  photos: readonly PhotoItem[];
  onOpen: (photo: PhotoItem) => void;
}) {
  const { t } = useTranslation();
  const stops = buildExhibitionStops(photos);
  const conceptLead = opticalArchiveById["contact-sheet"];

  return (
    <section className="gallery-exhibition-atlas" aria-labelledby="gallery-atlas-title">
      <header className="gallery-exhibition-atlas__heading">
        <span>{t("gallery.atlasEyebrow")}</span>
        <div>
          <h3 id="gallery-atlas-title">{t("gallery.atlasTitle")}</h3>
          <p>{t("gallery.atlasIntro")}</p>
        </div>
      </header>

      <div className="gallery-exhibition-atlas__lead">
        <ImageWithFallback
          src={conceptLead.imageUrl}
          alt={t(conceptLead.altKey as never)}
          title={t(conceptLead.altKey as never)}
          tone="cream"
          sizes="(max-width: 760px) 100vw, 38vw"
        />
        <div>
          <span>{t("gallery.atlasConceptDisclosure")}</span>
          <strong>{String(stops.length).padStart(2, "0")}</strong>
          <p>{t("gallery.atlasRealWork", { count: photos.length })}</p>
        </div>
      </div>

      <div className="gallery-exhibition-atlas__stops">
        {stops.map((stop, stopIndex) => (
          <article className="gallery-exhibition-stop" key={stop.id}>
            <header>
              <span>{String(stopIndex + 1).padStart(2, "0")}</span>
              <div>
                <h4><MapPin size={15} aria-hidden="true" />{stop.location}</h4>
                <p>{t(`gallery.seasons.${stop.season}` as never)}</p>
              </div>
            </header>
            <div className="gallery-exhibition-stop__photos">
              {stop.photos.map((photo, photoIndex) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => onOpen(photo)}
                  aria-label={`${t("gallery.viewLargeImage")}${photo.title}`}
                >
                  <ImageWithFallback
                    src={photo.imageUrl}
                    alt={photo.alt}
                    title={photo.title}
                    tone={photoIndex % 2 === 0 ? "sage" : "rose"}
                    sizes="(max-width: 620px) 78vw, 24vw"
                  />
                  <span>{photo.title}</span>
                  <small>{photo.album || t("gallery.otherAlbum")}</small>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
