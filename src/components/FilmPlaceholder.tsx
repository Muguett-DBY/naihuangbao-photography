import { useTranslation } from "react-i18next";
import "../styles/boundaries.css";
import { ImageOff } from "lucide-react";

export function FilmPlaceholder({ title, tone = "rose" }: { title: string; tone?: "rose" | "sage" | "cream" | "ink" }) {
  const { t } = useTranslation();
  return (
    <div className={`film-placeholder film-placeholder-${tone}`} role="img" aria-label={`${t("gallery.placeholder")}: ${title}`} data-state="image-unavailable">
      <div className="film-grain" aria-hidden="true" />
      <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
      <span>{t("gallery.placeholder")}</span>
      <strong>{title}</strong>
    </div>
  );
}
