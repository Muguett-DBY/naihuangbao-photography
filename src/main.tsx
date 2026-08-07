import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { preloadRoute, router } from "./router";
import { RoutePreloadProvider } from "./routing/RoutePreloadProvider";
import { initializeAppearancePreferences } from "./lib/appearance-preferences";
import { initWebVitals } from "./utils/webVitals";
import { i18nReady } from "./i18n";
import "./styles/global.css";
import "./styles/animal-theme.css";

initializeAppearancePreferences();
initWebVitals();

// Idle-time prefetch is limited to desktop connections that have not requested data savings.
const connection = (navigator as Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
}).connection;
const canPrefetchGalleryImages = window.matchMedia("(min-width: 981px)").matches
  && !connection?.saveData
  && connection?.effectiveType !== "2g"
  && connection?.effectiveType !== "slow-2g";

if (window.location.pathname === "/" && canPrefetchGalleryImages && "requestIdleCallback" in window) {
  requestIdleCallback(
    () => {
      const imgs = ["/images/gallery/640/gallery-urban-01.webp", "/images/gallery/640/gallery-garden-01.webp", "/images/gallery/640/gallery-jiangnan-01.webp"];
      imgs.forEach((src) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = src;
        document.head.append(link);
      });
    },
    { timeout: 3000 },
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found");
}

void i18nReady.finally(() => {
  createRoot(root).render(
    <StrictMode>
      <RoutePreloadProvider preloadRoute={preloadRoute}>
        <RouterProvider router={router} />
      </RoutePreloadProvider>
    </StrictMode>,
  );

  requestAnimationFrame(() => {
    document.body.classList.add("is-loaded");
  });
});
