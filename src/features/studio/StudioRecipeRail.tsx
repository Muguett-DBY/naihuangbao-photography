import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { CompositionBlendMode } from "../../types/composition";
import type { CompositionMode } from "../../lib/composition-layout";

export type CompositionRecipe = {
  id: string;
  name: string;
  note: string;
  accent: string;
  mode: CompositionMode;
  paperColor: string;
  title: string;
  caption: string;
  titleScale: number;
  blendMode: CompositionBlendMode;
  opacity: number;
};

export const compositionRecipes: readonly CompositionRecipe[] = [
  { id: "cream-dawn", name: "CREAM DAWN", note: "柔黄晨光 / 轻盈胶片条", accent: "#e4bd65", mode: "filmstrip", paperColor: "#fffaf0", title: "NHB / CREAM DAWN", caption: "PAPER / WATER / MORNING LIGHT", titleScale: 1.05, blendMode: "screen", opacity: 0.94 },
  { id: "moss-index", name: "MOSS INDEX", note: "雨后苔庭 / 档案联系表", accent: "#68775b", mode: "contact-sheet", paperColor: "#dfe7d8", title: "NHB / MOSS INDEX", caption: "RAIN / GLASS / MATERIAL MEMORY", titleScale: 0.92, blendMode: "multiply", opacity: 0.92 },
  { id: "coral-cut", name: "CORAL CUT", note: "珊瑚折射 / 先锋明信片", accent: "#c9756a", mode: "postcard", paperColor: "#f4e3b6", title: "NHB / CORAL CUT", caption: "REFRACTION / SILK / AFTERGLOW", titleScale: 1.12, blendMode: "soft-light", opacity: 0.96 },
  { id: "berry-night", name: "BERRY NIGHT", note: "深莓暗房 / 夜间拼贴", accent: "#6b2d40", mode: "moodboard", paperColor: "#5b2438", title: "NHB / BERRY NIGHT", caption: "PRINT ROOM / RAIN / LOW LIGHT", titleScale: 0.88, blendMode: "screen", opacity: 0.88 },
] as const;

export function StudioRecipeRail({ onApply }: { onApply: (recipe: CompositionRecipe) => void }) {
  return (
    <section className="studio-recipe-rail" aria-labelledby="studio-recipe-title">
      <header><Sparkles size={17} aria-hidden="true" /><div><strong id="studio-recipe-title">LIGHT RECIPES</strong><small>一键建立格式、纸色和图层关系，之后仍可逐项调整</small></div></header>
      <div>
        {compositionRecipes.map((recipe, index) => (
          <button type="button" key={recipe.id} onClick={() => onApply(recipe)} style={{ "--recipe-accent": recipe.accent } as CSSProperties}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{recipe.name}</strong><small>{recipe.note}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
