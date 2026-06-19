import { GitCompare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCompare } from "../hooks/useCompare";

type CompareButtonProps = {
  entry: { id: string; title?: string; href: string; imageUrl?: string };
  variant?: "icon" | "pill";
};

export function CompareButton({ entry, variant = "icon" }: CompareButtonProps) {
  const { t } = useTranslation();
  const { isComparing, toggle, count, maxItems } = useCompare();
  const active = isComparing(entry.id);
  const full = !active && count >= maxItems;

  return (
    <button
      type="button"
      className={`compare-btn compare-btn--${variant}${active ? " is-active" : ""}${full ? " is-disabled" : ""}`}
      onClick={() => toggle(entry)}
      aria-pressed={active}
      aria-disabled={full}
      aria-label={active ? t("photoCompare.remove", "Remove from compare") : t("photoCompare.add", "Add to compare")}
      title={full ? t("photoCompare.fullHint", "Compare is full (max 2)") : undefined}
    >
      <GitCompare size={variant === "icon" ? 16 : 14} aria-hidden="true" />
      {variant === "pill" && (
        <span>{active ? t("photoCompare.inCompare", "Comparing") : t("photoCompare.add", "Compare")}</span>
      )}
    </button>
  );
}
