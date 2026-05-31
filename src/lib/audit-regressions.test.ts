import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const adminSource = [
  "src/components/AdminDashboard.tsx",
  "src/components/admin/AdminShell.tsx",
  "src/components/admin/AdminPhotosTab.tsx",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const adminHelpersSource = readFileSync(resolve(root, "src/lib/admin-helpers.tsx"), "utf8");
const cssSource = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const imageSource = readFileSync(resolve(root, "src/components/ImageWithFallback.tsx"), "utf8");
const lightboxSource = readFileSync(resolve(root, "src/components/Lightbox.tsx"), "utf8");
const widgetSource = readFileSync(resolve(root, "src/components/PublicChatWidget.tsx"), "utf8");
const photoWallSource = readFileSync(resolve(root, "src/components/PhotoWall3DCss.tsx"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");
const reviewsSource = readFileSync(resolve(root, "src/components/Reviews.tsx"), "utf8");
const headersSource = readFileSync(resolve(root, "public/_headers"), "utf8");
const redirectsSource = readFileSync(resolve(root, "public/_redirects"), "utf8");
const useInViewSource = readFileSync(resolve(root, "src/hooks/useInView.ts"), "utf8");
const gsapAnimationsSource = readFileSync(resolve(root, "src/hooks/useGsapAnimations.ts"), "utf8");
const e2eConfigSource = readFileSync(resolve(root, "e2e/playwright.config.ts"), "utf8");
const e2eSmokeSource = readFileSync(resolve(root, "e2e/smoke.spec.ts"), "utf8");
const photosMapperSource = readFileSync(resolve(root, "functions/_photos.ts"), "utf8");
const publicPhotosApiSource = readFileSync(resolve(root, "functions/api/photos.ts"), "utf8");
const adminPhotosApiSource = readFileSync(resolve(root, "functions/api/admin/photos.ts"), "utf8");
const adminPhotoApiSource = readFileSync(resolve(root, "functions/api/admin/photos/[id].ts"), "utf8");
const authSource = readFileSync(resolve(root, "functions/_auth.ts"), "utf8");
const securitySource = readFileSync(resolve(root, "functions/_security.ts"), "utf8");
const paymentWebhookSource = readFileSync(resolve(root, "functions/api/payment/webhook.ts"), "utf8");
const paymentConfirmSource = readFileSync(resolve(root, "functions/api/payment/confirm.ts"), "utf8");
const sitemapSource = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
const adminCssSource = readFileSync(resolve(root, "src/styles/admin.css"), "utf8");
const dashboardSource = readFileSync(resolve(root, "src/pages/DashboardPage.tsx"), "utf8");
const viteConfigSource = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const businessMigrationSource = readFileSync(resolve(root, "db/migrations/005_create_business_tables.sql"), "utf8");
const videoPlayerSource = readFileSync(resolve(root, "src/components/VideoPlayer.tsx"), "utf8");
const photoMapSource = readFileSync(resolve(root, "src/components/PhotoMap.tsx"), "utf8");
const presetPreviewSource = readFileSync(resolve(root, "src/components/PresetPreview.tsx"), "utf8");
const customCursorSource = readFileSync(resolve(root, "src/components/CustomCursor.tsx"), "utf8");
const bookingCalendarSource = readFileSync(resolve(root, "src/components/BookingCalendar.tsx"), "utf8");
const loadingScreenSource = readFileSync(resolve(root, "src/components/LoadingScreen.tsx"), "utf8");
const errorBoundarySource = readFileSync(resolve(root, "src/components/ErrorBoundary.tsx"), "utf8");
const mapPageSource = readFileSync(resolve(root, "src/pages/MapPage.tsx"), "utf8");
const styleQuizSource = readFileSync(resolve(root, "src/components/StyleQuiz.tsx"), "utf8");
const seoSource = readFileSync(resolve(root, "src/lib/seo.ts"), "utf8");
const i18nSource = readFileSync(resolve(root, "src/i18n/index.ts"), "utf8");
const packageSource = readFileSync(resolve(root, "package.json"), "utf8");
const loginPageSource = readFileSync(resolve(root, "src/pages/LoginPage.tsx"), "utf8");
const registerApiSource = readFileSync(resolve(root, "functions/api/auth/register.ts"), "utf8");
const jaLocaleSource = readFileSync(resolve(root, "src/i18n/locales/ja.json"), "utf8");
const zhLocaleSource = readFileSync(resolve(root, "src/i18n/locales/zh-CN.json"), "utf8");
const enLocaleSource = readFileSync(resolve(root, "src/i18n/locales/en.json"), "utf8");
const koLocaleSource = readFileSync(resolve(root, "src/i18n/locales/ko.json"), "utf8");
const locales = {
  zh: JSON.parse(zhLocaleSource),
  en: JSON.parse(enLocaleSource),
  ja: JSON.parse(jaLocaleSource),
  ko: JSON.parse(koLocaleSource),
} as const;

function countOccurrences(source: string, token: string) {
  return source.split(token).length - 1;
}

describe("audit regression coverage", () => {
  it("limits the hand-written display font to titles and compact UI accents", () => {
    const bodyBlock = cssSource.match(/body\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const chatTextareaBlock = cssSource.match(/\.public-chat-form textarea\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    expect(cssSource).toContain("--font-display-cn");
    expect(cssSource).toContain('"Naihuangbao WenKai"');
    expect(bodyBlock).toContain("font-family: var(--font-body)");
    expect(cssSource).toMatch(/\.hero-magazine-title\s*\{[^}]*font-family:\s*var\(--font-display-cn\)/s);
    expect(cssSource).toMatch(/\.hero-cover-primary-btn\s*\{[^}]*font-family:\s*var\(--font-display-cn\)/s);
    expect(chatTextareaBlock).not.toContain("var(--font-display-cn)");
    expect(cssSource).not.toMatch(/\.public-chat-form textarea\s*\{[\s\S]*Naihuangbao WenKai/s);
  });

  it("imports PhotoSwipe with its built-in animations and gestures", () => {
    expect(lightboxSource).toContain('from "photoswipe"');
    expect(lightboxSource).toContain('import "photoswipe/style.css"');
    expect(lightboxSource).toContain("wheelToZoom: true");
    expect(lightboxSource).toContain('showHideAnimationType: "zoom"');
    expect(lightboxSource).toContain("doubleTapAction");
  });

  it("delegates lightbox keyboard and gesture handling to PhotoSwipe", () => {
    expect(lightboxSource).toContain('from "photoswipe"');
    expect(lightboxSource).toContain("new PhotoSwipe");
    expect(lightboxSource).toContain('pswp.on("close"');
    expect(lightboxSource).toContain("onFallbackKeydown");
    expect(lightboxSource).toContain("onFallbackClick");
    expect(lightboxSource).toContain("tapAction");
    expect(lightboxSource).toContain("wheelToZoom");
    expect(lightboxSource).not.toContain("dialogRef");
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain("handleImageLoad");
  });

  it("lets PhotoSwipe handle image viewport fitting via its built-in layout", () => {
    expect(lightboxSource).toContain("width: 1600");
    expect(lightboxSource).toContain("height: 1200");
    expect(lightboxSource).toContain("preloaderDelay");
    expect(lightboxSource).toContain("padding");
    expect(lightboxSource).not.toContain(".lightbox-content");
    expect(lightboxSource).not.toContain(".lightbox-image-wrap");
  });

  it("renders PhotoSwipe as a self-contained modal outside the DOM tree", () => {
    expect(cssSource).toMatch(/main\s*\{[^}]*overflow:\s*hidden/s);
    expect(cssSource).toMatch(/\.section-shell\s*\{[^}]*transform:\s*translateY/s);
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain('from "react-dom"');
    expect(lightboxSource).toContain("new PhotoSwipe");
  });

  it("resets image fallback state when the source changes", () => {
    expect(imageSource).toContain("useEffect");
    expect(imageSource).toContain("setFailed(false)");
    expect(imageSource).toContain("setLoaded(false)");
  });

  it("cleans admin timers, object URLs, and initial session fetches", () => {
    expect(adminSource).toContain("toastTimerRef");
    expect(adminSource).toContain("window.clearTimeout");
    expect(adminSource).toContain("URL.revokeObjectURL");
    expect(adminSource).toContain("AbortController");
    expect(adminSource).not.toContain("} catch {}");
  });

  it("continues non-stream chat reveal ticks until the reply is complete", () => {
    expect(widgetSource).toContain("normalizeAssistantReplyText");
    expect(widgetSource).toContain("Array.from(reply)");
    expect(widgetSource).toContain("const chatRevealBatchSize = 4");
    expect(widgetSource).toMatch(/await\s+revealAssistantReply\(assistantId,\s*data\.reply\)/);
    expect(widgetSource).toMatch(/revealTimerRef\.current\s*=\s*window\.setTimeout\(revealNextCharacter,\s*chatRevealDelayMs\)/);
  });

  it("uses a visible chat typing cadence and indicator for streamed and JSON replies", () => {
    const delayUses = widgetSource.match(/setTimeout\([^,]+,\s*chatRevealDelayMs\)/g) ?? [];
    expect(widgetSource).toContain("const chatRevealDelayMs = 40");
    expect(widgetSource).toContain("loadingRef.current");
    expect(widgetSource).toContain("typingRef.current");
    expect(widgetSource).toContain("cancelReveal");
    expect(delayUses.length).toBeGreaterThanOrEqual(3);
    expect(widgetSource).not.toMatch(/setTimeout\([^,]+,\s*28\)/);
    expect(widgetSource).not.toMatch(/if\s*\(\s*prefersReducedMotion\(\)\s*\)/);
    expect(widgetSource).toContain("public-chat-typing-label");
    expect(widgetSource).toContain("public-chat-cursor");
    expect(cssSource).toContain(".public-chat-typing-label");
    expect(cssSource).toContain("@keyframes publicChatTypingBlink");
  });

  it("limits will-change to elements that are actively animated or interacted with", () => {
    expect(cssSource).not.toMatch(/\.kicker,\s*\.hero h1,\s*\.hero-intro,\s*\.hero-actions > \*,\s*\.hero-scroll-cue/s);
    expect(cssSource).not.toMatch(/\.section-shell,\s*\.section-body > \*,\s*\.package-card,\s*\.why-card/s);
    expect(cssSource).not.toMatch(/\.public-chat-panel,\s*\.public-chat-message\s*\{[\s\S]*will-change:\s*transform/s);
    expect(cssSource).toMatch(/\.site-nav::after\s*\{[\s\S]*will-change:\s*transform/s);
    expect(cssSource).toMatch(/\.hero-cover-design\s*\{[\s\S]*position:\s*absolute/s);
    expect(cssSource).toMatch(/\.scroll-top\s*\{[\s\S]*will-change:\s*transform,\s*opacity/s);
  });

  it("does not keep duplicated global accessibility blocks", () => {
    expect(countOccurrences(cssSource, "Focus Styles")).toBe(1);
    expect(countOccurrences(cssSource, "Reduced Motion")).toBe(1);
  });

  it("keeps security headers and local e2e targets in place", () => {
    expect(headersSource).toContain("Content-Security-Policy");
    expect(headersSource).toContain("https://static.cloudflareinsights.com");
    expect(headersSource).toContain("https://cloudflareinsights.com");
    expect(headersSource).toContain("frame-ancestors 'none'");
    expect(headersSource).toContain("object-src 'none'");
    expect(redirectsSource).toContain("/admin /admin/ 301");
    expect(redirectsSource).toContain("/admin/ /index.html 200");
    expect(e2eConfigSource).toContain('testDir: "."');
    expect(e2eConfigSource).toContain("webServer");
    expect(e2eConfigSource).toContain("127.0.0.1:4174");
    expect(e2eSmokeSource).toContain('page.goto("/")');
    expect(e2eSmokeSource).toContain("openGalleryFromNav");
    expect(e2eSmokeSource).toContain("#site-navigation-menu");
    expect(e2eSmokeSource).toContain('a[href="/gallery"]');
    expect(e2eSmokeSource).toContain('toHaveAttribute("data-theme"');
    expect(e2eSmokeSource).not.toContain("https://shoot.custard.top/");
    expect(e2eSmokeSource).not.toContain("waitForTimeout");
    expect(e2eSmokeSource).not.toContain('a[href="#gallery"]');
  });

  it("avoids stale intersection state and hidden-tab gallery RAF work", () => {
    expect(useInViewSource).toContain("[threshold, once, inView]");
    expect(gsapAnimationsSource).toContain("WeakMap<HTMLElement, IntersectionObserver>");
    expect(gsapAnimationsSource).toContain("WeakMap<HTMLElement, number>");
    expect(gsapAnimationsSource).toContain("!document.hidden");
    expect(gsapAnimationsSource).not.toContain("_autoScrollIO");
    expect(gsapAnimationsSource).not.toContain("_autoScrollRaf");
  });

  it("keeps remote photo metadata compatible with old and new database schemas", () => {
    expect(existsSync(resolve(root, "db/migrations/001_initial_schema.sql"))).toBe(true);
    expect(existsSync(resolve(root, "db/migrations/002_add_photo_metadata.sql"))).toBe(true);
    expect(photosMapperSource).toContain("buildPhotoSelectList");
    expect(photosMapperSource).toContain("pragma table_info(photos)");
    expect(photosMapperSource).toContain("album: row.album ?? undefined");
    expect(photosMapperSource).toContain("videoUrl: row.video_url ?? undefined");
    expect(photosMapperSource).toContain("noteUrl: row.note_url ?? undefined");
    expect(publicPhotosApiSource).toContain("buildPhotoSelectList");
    expect(adminPhotosApiSource).toContain("buildPhotoSelectList");
  });

  it("keeps admin photo mutations protected from simple cross-site form posts", () => {
    expect(adminPhotosApiSource).toContain("isAdminMutationRequest");
    expect(adminPhotoApiSource).toContain("isAdminMutationRequest");
    expect(adminSource).toContain("adminMutationHeaders");
    expect(adminHelpersSource).toContain('"x-nhb-admin-action": "1"');
    expect(adminSource).toContain("allowedPhotoTypes");
    expect(adminSource).toContain("maxPhotoUploadSize");
  });

  it("fails closed for user auth secrets and Cloudflare Access admin headers", () => {
    const allFunctionSource = readFileSync(resolve(root, "functions/api/auth/login.ts"), "utf8")
      + readFileSync(resolve(root, "functions/api/auth/register.ts"), "utf8")
      + readFileSync(resolve(root, "functions/api/auth/session.ts"), "utf8")
      + readFileSync(resolve(root, "functions/api/user/bookings.ts"), "utf8")
      + readFileSync(resolve(root, "functions/api/user/workshops.ts"), "utf8");
    expect(allFunctionSource).not.toContain("default-auth-secret");
    expect(securitySource).toContain("getRequiredAuthSecret");
    expect(securitySource).toContain("secret.length >= 32");
    expect(authSource).toContain("CF_ACCESS_ADMIN_EMAILS");
    expect(authSource).toContain("allowedAccessEmails.has");
  });

  it("protects payment placeholders from forged webhook and status lookup abuse", () => {
    expect(paymentWebhookSource).toContain("STRIPE_WEBHOOK_SECRET");
    expect(paymentWebhookSource).toContain("verifyStripeSignature");
    expect(paymentWebhookSource).toContain("stripe-signature");
    expect(paymentConfirmSource).toContain("client_secret");
    expect(paymentConfirmSource).toContain("body.clientSecret");
    expect(securitySource).toContain("requirePublicMutationRequest");
    expect(securitySource).toContain("enforceRateLimit");
  });

  it("keeps high-risk UI injection and object URL fixes in place", () => {
    expect(videoPlayerSource).toContain("parseSafeUrl");
    expect(videoPlayerSource).not.toContain("return match ? `https://www.youtube.com/embed/${match[1]}` : url");
    expect(photoMapSource).toContain("buildClickPopupContent");
    expect(photoMapSource).toContain("textContent");
    expect(presetPreviewSource).toContain("URL.revokeObjectURL");
    expect(customCursorSource).not.toContain("cursor: none");
    expect(bookingCalendarSource).toContain("calendarRef");
    expect(loadingScreenSource).not.toContain("dangerouslySetInnerHTML");
  });

  it("keeps small i18n regressions fixed", () => {
    expect(errorBoundarySource).toContain("errorBoundary.title");
    expect(errorBoundarySource).not.toContain("this.state.error?.message");
    expect(mapPageSource).toContain('t("photoMap.eyebrow")');
    expect(styleQuizSource).toContain("quiz.recommendations.couple");
    expect(zhLocaleSource).toContain("recommendations.couple");
    expect(enLocaleSource).toContain("errorBoundary");
    expect(jaLocaleSource).toContain("recommendations.couple");
    expect(koLocaleSource).toContain("recommendations.couple");
    for (const locale of Object.values(locales)) {
      expect(locale.common.skipToContent).toBeTruthy();
      expect(locale.auth.userMenu).toBeTruthy();
    }
  });

  it("keeps public account registration on the stronger minimum password policy", () => {
    expect(loginPageSource).toContain('minLength={mode === "register" ? 8 : undefined}');
    expect(registerApiSource).toContain("password.length < 8");
    expect(registerApiSource).toContain("密码至少需要8个字符");
    for (const locale of Object.values(locales)) {
      expect(locale.auth.passwordPlaceholder).toMatch(/8|八|８/);
    }
  });

  it("pauses expensive visual loops and touch listeners when they are not useful", () => {
    expect(photoWallSource).toContain("IntersectionObserver");
    expect(photoWallSource).toContain("document.hidden");
    expect(photoWallSource).toContain("visibilitychange");
    expect(gallerySource).toContain("touchCleanupRef");
    expect(gallerySource).toContain('document.removeEventListener("touchend", clear)');
    expect(gallerySource).toContain('document.removeEventListener("touchmove", clear)');
  });

  it("keeps visible review content and SEO alternates localized", () => {
    expect(reviewsSource).toContain('t("reviews.items"');
    expect(zhLocaleSource).toContain('"items"');
    expect(enLocaleSource).toContain('"items"');
    expect(jaLocaleSource).toContain('"輪郭補正"');
    expect(jaLocaleSource).toContain('"items"');
    expect(koLocaleSource).toContain('"items"');
    expect(seoSource).toContain('hreflang="en"');
    expect(seoSource).toContain('hreflang="ja"');
    expect(seoSource).toContain('hreflang="ko"');
    expect(i18nSource).toContain('new URLSearchParams(window.location.search).get("lang")');
    expect(i18nSource).toContain("supportedLanguages");
  });

  it("keeps small build and CSS cleanup items from regressing", () => {
    expect(packageSource).toContain('"assets:crop": "node scripts/crop-gallery-assets.mjs"');
    expect(packageSource).not.toContain('"assets:crop": "node --import tsx/esm scripts/crop-gallery-assets.mjs"');
    expect(cssSource).not.toContain("height: 100dvh;\n  height: 100dvh;");
  });

  it("lists indexable public routes without exposing account pages in the sitemap", () => {
    for (const route of ["/gallery", "/booking", "/courses", "/products", "/workshops", "/shop", "/map"]) {
      expect(sitemapSource).toContain(`<loc>https://shoot.custard.top${route}</loc>`);
    }
    expect(sitemapSource).not.toContain("<loc>https://shoot.custard.top/login</loc>");
    expect(sitemapSource).not.toContain("<loc>https://shoot.custard.top/dashboard</loc>");
    expect(sitemapSource).not.toContain("<loc>https://shoot.custard.top/admin</loc>");
  });

  it("uses shared constant-time comparisons and weighted adjacent rate-limit windows", () => {
    expect(securitySource).toContain("export function timingSafeEqual");
    expect(securitySource).toContain("previousWindowStart");
    expect(securitySource).toContain("previousWeight");
    expect(securitySource).not.toContain('"nhb-rate-limit"');
    expect(authSource).toContain("timingSafeEqual");
    expect(authSource).not.toContain("signature !== expected");
    expect(authSource).not.toContain("signature === expected");
    expect(paymentWebhookSource).toContain("timingSafeEqual");
    expect(paymentWebhookSource).not.toContain("timingSafeEqualHex");
  });

  it("creates missing business tables and keeps course purchases idempotent", () => {
    for (const table of ["courses", "course_modules", "presets", "workshops", "workshop_registrations", "merchandise", "payment_intents", "course_purchases", "purchases"]) {
      expect(businessMigrationSource).toContain(`create table if not exists ${table}`);
    }
    expect(businessMigrationSource).toContain("unique (course_id, user_id)");
    expect(paymentWebhookSource).not.toContain("INSERT OR REPLACE");
    expect(paymentWebhookSource).toContain("ON CONFLICT(course_id, user_id)");
  });

  it("keeps the admin shell usable in dark mode and by keyboard", () => {
    expect(adminCssSource).toContain(":focus-visible");
    expect(adminCssSource).toContain("outline: 3px solid #f1c2ae");
    expect(adminCssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(adminCssSource).toContain(':root[data-theme="dark"] .adm-root');
    expect(dashboardSource).toContain('htmlFor="dashboard-display-name"');
    expect(dashboardSource).toContain('id="dashboard-display-name"');
    expect(dashboardSource).toContain('htmlFor="dashboard-current-password"');
    expect(dashboardSource).toContain('id="dashboard-current-password"');
    expect(dashboardSource).toContain('htmlFor="dashboard-new-password"');
    expect(dashboardSource).toContain('id="dashboard-new-password"');
  });

  it("caches stable content, editor models, and font assets at runtime", () => {
    expect(viteConfigSource).toContain('cacheName: "api-content"');
    expect(viteConfigSource).toContain('cacheName: "editor-models"');
    expect(viteConfigSource).toContain('cacheName: "font-assets"');
    expect(viteConfigSource).not.toContain("backgroundSync");
  });
});
