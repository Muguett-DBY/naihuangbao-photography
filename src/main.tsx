import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { router } from "./router";
import "./i18n";
import "animal-island-ui/style";
import "./styles/global.css";
import "./styles/animal-theme.css";

gsap.registerPlugin(ScrollTrigger);

// Idle-time prefetch of key gallery images
if ("requestIdleCallback" in window) {
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

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

requestAnimationFrame(() => {
  document.body.classList.add("is-loaded");
});
