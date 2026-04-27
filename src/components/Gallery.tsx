import { useEffect, useMemo, useState } from "react";
import { galleryItems } from "../data/gallery";
import { styleLabels } from "../data/site";
import { getPhotosByStyle } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";
import { FilmPlaceholder } from "./FilmPlaceholder";
import { Section } from "./Section";

type StyleFilter = PhotoStyle | "all";

const filters = Object.keys(styleLabels) as StyleFilter[];
const tones = ["rose", "sage", "cream", "ink"] as const;

export function Gallery() {
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const sourcePhotos = remotePhotos.length > 0 ? remotePhotos : galleryItems;
  const photos = useMemo(() => getPhotosByStyle(sourcePhotos, filter), [sourcePhotos, filter]);

  useEffect(() => {
    let ignore = false;

    async function loadRemotePhotos() {
      try {
        const response = await fetch("/api/photos");
        if (!response.ok) return;
        const data = (await response.json()) as { photos?: PhotoItem[] };
        if (!ignore && Array.isArray(data.photos)) {
          setRemotePhotos(data.photos);
        }
      } catch {
        // Local Vite dev has no Pages Functions; static placeholders remain visible.
      }
    }

    void loadRemotePhotos();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Section
      id="gallery"
      eyebrow="Gallery"
      title="作品像一本慢慢翻开的相册"
      intro="目前先放入小红书公开主页可读到的风格线索和授权占位，正式上线前替换为原图上传后的作品。"
    >
      <div className="filter-row" role="tablist" aria-label="作品分类">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={item === filter ? "is-active" : ""}
            onClick={() => setFilter(item)}
          >
            {styleLabels[item]}
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <article className="gallery-card" key={photo.id}>
            {photo.imageUrl ? (
              <img loading="lazy" src={photo.imageUrl} alt={photo.alt} />
            ) : (
              <FilmPlaceholder title={photo.title} tone={tones[index % tones.length]} />
            )}
            <div>
              <p>{styleLabels[photo.style]}</p>
              <h3>{photo.title}</h3>
              <span>{photo.location}</span>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
