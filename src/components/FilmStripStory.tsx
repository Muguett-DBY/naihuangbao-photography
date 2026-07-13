import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { ImageWithFallback } from "./ImageWithFallback";

const NOTE_COUNT = 6;

export function FilmStripStory() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();

  const displayPhotos = useMemo(
    () => photos.filter((photo) => photo.visibility === "public").slice(0, NOTE_COUNT),
    [photos],
  );

  const captions = useMemo(
    () => Array.from({ length: NOTE_COUNT }, (_, index) => t(`filmstrip.caption${index + 1}` as never)),
    [t],
  );

  if (displayPhotos.length === 0) return null;

  return (
    <section
      className="field-notes"
      id="field-notes"
      aria-labelledby="field-notes-title"
    >
      <header className="field-notes-heading">
        <p>01 / {t("filmstrip.title" as never)}</p>
        <h2 id="field-notes-title">{t("filmstrip.title" as never)}</h2>
      </header>

      <div className="field-notes-grid">
        {displayPhotos.map((photo, index) => (
          <Link className="field-note" key={photo.id} to={`/gallery/${photo.id}`}>
            <div className="field-note-image">
              <ImageWithFallback
                src={photo.imageUrl}
                alt={photo.alt}
                title={photo.title}
                tone="ink"
                priority={index < 2}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
    </section>
  );
}
