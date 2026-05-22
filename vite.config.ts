import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icon-vendor";
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      manifest: false,
      includeAssets: [
        "manifest.webmanifest",
        "wechat-share.jpg",
        "icons/pwa-icon.svg",
        "icons/pwa-icon-192.png",
        "icons/pwa-icon-512.png",
        "icons/pwa-maskable-512.png",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,jpg,jpeg}"],
        globIgnores: [
          "**/images/gallery/**/*",
          "**/three.module-*.js",
          "**/gsap-*.js",
          "**/ScrollTrigger-*.js",
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => {
              const imageRequest = request as unknown as { destination?: string };
              return imageRequest.destination === "image" && url.pathname.startsWith("/images/gallery/");
            },
            handler: "CacheFirst",
            options: {
              cacheName: "gallery-images",
              expiration: {
                maxEntries: 36,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
