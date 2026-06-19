import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Camera, MapPin, Sparkles } from "lucide-react";
import { usePublicPhotos } from "../hooks/usePublicPhotos";
import { ImageWithFallback } from "./ImageWithFallback";

const STORAGE_KEY = "nhb-photo-of-the-day";
const DAY_MS = 24 * 60 * 60 * 1000;

function pickDeterministic<T>(items: T[], salt: number): T | null {
  if (items.length === 0) return null;
  const index = Math.abs(salt) % items.length;
  return items[index];
}

function dailySalt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { date: string; id: string };
      const storedDate = parsed.date;
      const today = new Date().toISOString().slice(0, 10);
      if (storedDate === today) {
        return Math.floor(new Date(today).getTime() / DAY_MS);
      }
    }
  } catch {
    // ignore
  }
  const today = new Date().toISOString().slice(0, 10);
  return Math.floor(new Date(today).getTime() / DAY_MS);
}

export function PhotoOfTheDay() {
  const { t } = useTranslation();
  const { photos } = usePublicPhotos();

  const featured = useMemo(() => {
    const visible = photos.filter((p) => p.visibility === "public" && p.featured);
    const list = visible.length > 0 ? visible : photos.filter((p) => p.visibility === "public");
    if (list.length === 0) return null;
    const salt = dailySalt();
    const pick = pickDeterministic(list, salt);
    if (pick && typeof window !== "undefined") {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored || JSON.parse(stored).date !== today) {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ date: today, id: pick.id }),
          );
        }
      } catch {
        // ignore
      }
    }
    return pick;
  }, [photos]);

  if (!featured) return null;

  return (
    <section className="photo-of-the-day" aria-labelledby="potd-title">
      <div className="potd-copy">
        <span className="potd-eyebrow">
          <Sparkles size={14} />
          {t("photoOfTheDay.eyebrow", "Photo of the day")}
        </span>
        <h2 id="potd-title">{featured.title}</h2>
        {featured.alt && <p className="potd-alt">{featured.alt}</p>}
        <div className="potd-meta">
          <span><Camera size={14} /> {t(`gallery.filters.${featured.style}`, featured.style)}</span>
          {featured.location && (
            <span><MapPin size={14} /> {featured.location}</span>
          )}
        </div>
        <Link to={`/gallery/${featured.id}`} className="potd-cta">
          {t("photoOfTheDay.view", "View photo")}
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="potd-image">
        {featured.videoUrl ? (
          <video
            src={featured.videoUrl}
            poster={featured.imageUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <ImageWithFallback
            src={featured.imageUrl}
            alt={featured.alt || featured.title}
            title={featured.title}
            tone="cream"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
      </div>
    </section>
  );
}
