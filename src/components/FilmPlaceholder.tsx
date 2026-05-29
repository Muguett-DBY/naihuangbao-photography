import { useTranslation } from "react-i18next";

export function FilmPlaceholder({ title, tone = "rose" }: { title: string; tone?: "rose" | "sage" | "cream" | "ink" }) {
  const { t } = useTranslation();
  return (
    <div className={`film-placeholder film-placeholder-${tone}`} aria-label={title}>
      <div className="film-grain" />
      <span>{t("gallery.placeholder")}</span>
      <strong>{title}</strong>
    </div>
  );
}
