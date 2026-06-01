import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/face-api.js")) {
            return "face-api-vendor";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion-vendor";
          }
          if (id.includes("node_modules/photoswipe")) {
            return "lightbox-vendor";
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n-vendor";
          }
          if (/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icon-vendor";
          }

          if (id.includes("node_modules/gsap")) {
            return "animation-vendor";
          }
          if (id.includes("node_modules/swiper")) {
            return "swiper-vendor";
          }
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "map-vendor";
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
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
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html}"],
        globIgnores: [
          "**/images/gallery/**/*",
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
                maxEntries: 48,
                maxAgeSeconds: 60 * 60 * 24 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              return url.pathname.startsWith("/api/photos");
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "api-photos",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              return url.pathname === "/api/content";
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "api-content",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              return url.pathname.startsWith("/models/");
            },
            handler: "CacheFirst",
            options: {
              cacheName: "editor-models",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 180,
              },
            },
          },
          {
            urlPattern: ({ request, url }) => {
              const assetRequest = request as unknown as { destination?: string };
              return assetRequest.destination === "font" || url.pathname.startsWith("/fonts/");
            },
            handler: "CacheFirst",
            options: {
              cacheName: "font-assets",
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
});
