import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { ImageWithFallback } from "./ImageWithFallback";

const NOTE_COUNT = 6;

export function FilmStripStory() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();
  const [activeIndex, setActiveIndex] = useState(0);

  const displayPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, NOTE_COUNT),
    [photos],
  );

  const captions = useMemo(
    () => Array.from({ length: NOTE_COUNT }, (_, index) => t(`filmstrip.caption${index + 1}` as never)),
    [t],
  );

  if (displayPhotos.length === 0) return null;

  const activePhoto = displayPhotos[activeIndex] ?? displayPhotos[0];
  const activeCaption = captions[activeIndex] ?? captions[0];

  return (
    <section
      className="field-notes"
      id="field-notes"
      aria-labelledby="field-notes-title"
      data-motion-group
    >
      <header className="field-notes-heading" data-motion-item>
        <p>01 / {t("filmstrip.title" as never)}</p>
        <h2 id="field-notes-title">{t("filmstrip.title" as never)}</h2>
      </header>

      <div className="field-notes-stage">
        <aside className="field-notes-rail" data-motion-item>
          <div className="field-notes-rail-folio">
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span>/ {String(displayPhotos.length).padStart(2, "0")}</span>
          </div>
          <div className="field-notes-rail-copy">
            <p className="field-notes-rail-kicker">{activePhoto.location}</p>
            <h3>{activePhoto.title}</h3>
            <p>{activeCaption}</p>
          </div>
          <Link className="field-notes-rail-link" to={`/gallery/${activePhoto.id}`}>
            {t("common.learnMore")}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <progress
            className="field-notes-progress"
            max={displayPhotos.length}
            value={activeIndex + 1}
            aria-label={`${activeIndex + 1} / ${displayPhotos.length}`}
          />
        </aside>

        <div className="field-notes-grid" data-motion-item>
          {displayPhotos.map((photo, index) => (
            <Link
              className={index === activeIndex ? "field-note is-active" : "field-note"}
              key={photo.id}
              to={`/gallery/${photo.id}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <div className="field-note-image">
                <ImageWithFallback
                  src={photo.imageUrl}
                  alt={photo.alt}
                  title={photo.title}
                  tone="ink"
                  priority={index < 2}
                  sizes={index === 0 || index === 4
                    ? "(max-width: 980px) 100vw, 66vw"
                    : "(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"}
                />
              </div>
              <div className="field-note-caption">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{captions[index]}</p>
                <ArrowUpRight size={18} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
