import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFavorites } from "../hooks/useFavorites";

type FavoriteButtonProps = {
  entry: { id: string; title?: string; href: string; imageUrl?: string };
  variant?: "icon" | "pill";
  onToggle?: (nowFavorited: boolean) => void;
};

export function FavoriteButton({ entry, variant = "pill", onToggle }: FavoriteButtonProps) {
  const { t } = useTranslation();
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(entry.id);

  const handleClick = () => {
    const next = toggle(entry);
    onToggle?.(next);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`favorite-btn favorite-btn--icon${favorited ? " is-active" : ""}`}
        onClick={handleClick}
        aria-pressed={favorited}
        aria-label={favorited ? t("favorites.remove", "Remove from favorites") : t("favorites.add", "Add to favorites")}
      >
        <Heart size={16} fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`favorite-btn favorite-btn--pill${favorited ? " is-active" : ""}`}
      onClick={handleClick}
      aria-pressed={favorited}
      aria-label={favorited ? t("favorites.remove", "Remove from favorites") : t("favorites.add", "Add to favorites")}
    >
      <Heart size={14} fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
      <span>
        {favorited ? t("favorites.saved", "Saved") : t("favorites.save", "Save")}
      </span>
    </button>
  );
}
