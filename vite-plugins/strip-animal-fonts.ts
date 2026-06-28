import type { Plugin } from "vite";

export function stripAnimalIslandFontFaces(css: string): string {
  return css.replace(/@font-face\s*\{[^{}]*\}/g, "");
}

export function stripAnimalIslandFonts(): Plugin {
  return {
    name: "strip-animal-island-fonts",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/").split("?", 1)[0];
      if (!normalizedId.endsWith("/animal-island-ui/dist/index.css")) return null;
      return stripAnimalIslandFontFaces(code);
    },
  };
}
