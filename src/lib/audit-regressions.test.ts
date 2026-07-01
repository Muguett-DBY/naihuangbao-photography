import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const adminSource = [
  "src/components/AdminDashboard.tsx",
  "src/components/admin/AdminShell.tsx",
  "src/components/admin/AdminPhotosTab.tsx",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const adminModerationQueueSource = readFileSync(resolve(root, "src/components/admin/AdminPhotoModerationQueue.tsx"), "utf8");
const adminPhotosSource = readFileSync(resolve(root, "src/components/admin/AdminPhotosTab.tsx"), "utf8");
const adminPhotosBatchApiSource = readFileSync(resolve(root, "functions/api/admin/photos/batch.ts"), "utf8");
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
const galleryPageSource = readFileSync(resolve(root, "src/pages/GalleryPage.tsx"), "utf8");
const reviewsSource = readFileSync(resolve(root, "src/components/Reviews.tsx"), "utf8");
const headersSource = readFileSync(resolve(root, "public/_headers"), "utf8");
const redirectsSource = readFileSync(resolve(root, "public/_redirects"), "utf8");
const ciWorkflowSource = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
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
const paymentCreateIntentSource = readFileSync(resolve(root, "functions/api/payment/create-intent.ts"), "utf8");
const paymentConfirmSource = readFileSync(resolve(root, "functions/api/payment/confirm.ts"), "utf8");
const responsesSource = readFileSync(resolve(root, "functions/_responses.ts"), "utf8");
const publicChatApiSource = readFileSync(resolve(root, "functions/api/chat.ts"), "utf8");
const photoDownloadApiSource = readFileSync(resolve(root, "functions/api/photos/[id]/download.ts"), "utf8");
const presetDownloadApiSource = readFileSync(resolve(root, "functions/api/presets/[id]/download.ts"), "utf8");
const productsPageSource = readFileSync(resolve(root, "src/pages/ProductsPage.tsx"), "utf8");
const presetDetailPageSource = readFileSync(resolve(root, "src/pages/PresetDetailPage.tsx"), "utf8");
const adminSessionApiSource = readFileSync(resolve(root, "functions/api/admin/session.ts"), "utf8");
const dashboardBookingsSource = readFileSync(resolve(root, "src/components/dashboard/BookingsTab.tsx"), "utf8");
const bookingModalSource = readFileSync(resolve(root, "src/components/BookingModal.tsx"), "utf8");
const bookingTimeSlotPickerPath = resolve(root, "src/components/BookingTimeSlotPicker.tsx");
const bookingTimeSlotPickerSource = existsSync(bookingTimeSlotPickerPath) ? readFileSync(bookingTimeSlotPickerPath, "utf8") : "";
const rescheduleApiSource = readFileSync(resolve(root, "functions/api/user/bookings/[id]/reschedule.ts"), "utf8");
const rootLayoutSource = readFileSync(resolve(root, "src/layouts/RootLayout.tsx"), "utf8");
const offlineFallbackSource = readFileSync(resolve(root, "src/components/OfflineFallback.tsx"), "utf8");
const offlineRecoveryPath = resolve(root, "src/components/OfflineBookingRecovery.tsx");
const offlineRecoverySource = existsSync(offlineRecoveryPath) ? readFileSync(offlineRecoveryPath, "utf8") : "";
const adminBookingsSource = readFileSync(resolve(root, "src/components/admin/AdminBookingsTab.tsx"), "utf8");
const adminBookingsApiSource = readFileSync(resolve(root, "functions/api/admin/bookings.ts"), "utf8");
const photoImageApiSource = readFileSync(resolve(root, "functions/api/photos/[id]/image.ts"), "utf8");
const sitemapSource = readFileSync(resolve(root, "public/sitemap.xml"), "utf8");
const adminCssSource = readFileSync(resolve(root, "src/styles/admin.css"), "utf8");
const editorCssSource = readFileSync(resolve(root, "src/styles/pages.css"), "utf8");
const sectionsCssSource = readFileSync(resolve(root, "src/styles/sections.css"), "utf8");
const dashboardSource = readFileSync(resolve(root, "src/components/dashboard/ProfileTab.tsx"), "utf8");
const viteConfigSource = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const businessMigrationSource = readFileSync(resolve(root, "db/migrations/005_create_business_tables.sql"), "utf8");
const videoPlayerSource = readFileSync(resolve(root, "src/components/VideoPlayer.tsx"), "utf8");
const photoMapSource = readFileSync(resolve(root, "src/components/PhotoMap.tsx"), "utf8");
const customMarkerSource = readFileSync(resolve(root, "src/components/CustomMarker.tsx"), "utf8");
const presetPreviewSource = readFileSync(resolve(root, "src/components/PresetPreview.tsx"), "utf8");
const customCursorSource = readFileSync(resolve(root, "src/components/CustomCursor.tsx"), "utf8");
const filmGrainSource = readFileSync(resolve(root, "src/components/FilmGrain.tsx"), "utf8");
const bookingCalendarSource = readFileSync(resolve(root, "src/components/BookingCalendar.tsx"), "utf8");
const loadingScreenSource = readFileSync(resolve(root, "src/components/LoadingScreen.tsx"), "utf8");
const resilientClientStorageSources = [
  "src/pages/CourseDetailPage.tsx",
  "src/hooks/useUserPreferences.ts",
  "src/components/PushNotificationBanner.tsx",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const errorBoundarySource = readFileSync(resolve(root, "src/components/ErrorBoundary.tsx"), "utf8");
const pwaUpdateBannerSource = readFileSync(resolve(root, "src/components/PwaUpdateBanner.tsx"), "utf8");
const prefetchLinkSource = readFileSync(resolve(root, "src/components/shared/PrefetchLink.tsx"), "utf8");
const errorLoggerSource = readFileSync(resolve(root, "src/lib/error-logger.ts"), "utf8");
const themeToggleSource = readFileSync(resolve(root, "src/components/ThemeToggle.tsx"), "utf8");
const errorTrackerSource = readFileSync(resolve(root, "src/lib/error-tracker.ts"), "utf8");
const analyticsErrorApiSource = readFileSync(resolve(root, "functions/api/analytics/error.ts"), "utf8");
const adminErrorsApiPath = resolve(root, "functions/api/admin/errors.ts");
const adminErrorsApiSource = existsSync(adminErrorsApiPath) ? readFileSync(adminErrorsApiPath, "utf8") : "";
const adminErrorWorkflowApiPath = resolve(root, "functions/api/admin/errors/[id].ts");
const adminErrorWorkflowApiSource = existsSync(adminErrorWorkflowApiPath) ? readFileSync(adminErrorWorkflowApiPath, "utf8") : "";
const adminErrorReportsPath = resolve(root, "src/components/admin/AdminErrorReportsTab.tsx");
const adminErrorReportsSource = existsSync(adminErrorReportsPath) ? readFileSync(adminErrorReportsPath, "utf8") : "";
const schemaSource = readFileSync(resolve(root, "db/schema.sql"), "utf8");
const mapPageSource = readFileSync(resolve(root, "src/pages/MapPage.tsx"), "utf8");
const styleQuizSource = readFileSync(resolve(root, "src/components/StyleQuiz.tsx"), "utf8");
const seoSource = readFileSync(resolve(root, "src/lib/seo.ts"), "utf8");
const i18nSource = readFileSync(resolve(root, "src/i18n/index.ts"), "utf8");
const packageSource = readFileSync(resolve(root, "package.json"), "utf8");
const readmeSource = readFileSync(resolve(root, "README.md"), "utf8");
const paymentLiveReadinessPath = resolve(root, "docs/payment-live-readiness.md");
const paymentLiveReadinessSource = existsSync(paymentLiveReadinessPath) ? readFileSync(paymentLiveReadinessPath, "utf8") : "";
const wranglerSource = readFileSync(resolve(root, "wrangler.toml"), "utf8");
const htmlSource = readFileSync(resolve(root, "index.html"), "utf8");
const loginPageSource = readFileSync(resolve(root, "src/pages/LoginPage.tsx"), "utf8");
const dashboardPageSource = readFileSync(resolve(root, "src/pages/DashboardPage.tsx"), "utf8");
const useAuthSource = readFileSync(resolve(root, "src/hooks/useAuth.tsx"), "utf8");
const loginApiSource = readFileSync(resolve(root, "functions/api/auth/login.ts"), "utf8");
const registerApiSource = readFileSync(resolve(root, "functions/api/auth/register.ts"), "utf8");
const forgotPasswordApiSource = readFileSync(resolve(root, "functions/api/auth/forgot-password.ts"), "utf8");
const resetPasswordApiSource = readFileSync(resolve(root, "functions/api/auth/reset-password.ts"), "utf8");
const logoutApiSource = readFileSync(resolve(root, "functions/api/auth/logout.ts"), "utf8");
const businessDatePath = resolve(root, "src/utils/businessDate.ts");
const bookingPolicyHookPath = resolve(root, "src/hooks/useBookingPolicy.ts");
const bookingPolicyApiPath = resolve(root, "functions/api/booking/policy.ts");
const bookingApiSource = readFileSync(resolve(root, "functions/api/booking.ts"), "utf8");
const bookingRulesSource = readFileSync(resolve(root, "functions/_booking.ts"), "utf8");
const waitlistApiSource = readFileSync(resolve(root, "functions/api/booking/waitlist.ts"), "utf8");
const availabilityApiSource = readFileSync(resolve(root, "functions/api/availability.ts"), "utf8");
const offlineBookingSource = readFileSync(resolve(root, "src/utils/offlineBooking.ts"), "utf8");
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
  it("keeps booking self-service availability-aware and exposes mutation feedback", () => {
    expect(dashboardBookingsSource).toContain("BookingCalendar");
    expect(dashboardBookingsSource).toContain("useToast");
    expect(dashboardBookingsSource).toContain("getApiError");
    expect(dashboardBookingsSource).toMatch(/role="alert"/);
  });

  it("keeps dashboard rescheduling time-aware and aligned with direct booking", () => {
    expect(existsSync(bookingTimeSlotPickerPath)).toBe(true);
    expect(bookingModalSource).toContain("BookingTimeSlotPicker");
    expect(dashboardBookingsSource).toContain("BookingTimeSlotPicker");
    expect(dashboardBookingsSource).toContain("preferred_time: newTime");
    expect(dashboardBookingsSource).toContain("rescheduleRecoveryHint");
    expect(dashboardBookingsSource).toContain("body.recovery");
    expect(bookingModalSource).toContain("timeSlotRecoveryHint");
    expect(bookingModalSource).toContain("data.recovery");
    expect(dashboardBookingsSource).toContain("dashboard-reschedule-summary");
    expect(rescheduleApiSource).toContain("validateBookingTimeSlot");
    expect(rescheduleApiSource).toContain("isBookingTimeUnavailable");
    expect(rescheduleApiSource).toContain("recovery");
    expect(bookingApiSource).toContain("recovery");
    expect(rescheduleApiSource).toContain("preferred_time = ?");
    expect(bookingTimeSlotPickerSource).toContain("booking-time-slot-grid");
    for (const locale of Object.values(locales)) {
      expect(locale.dashboard.selectNewTime).toBeTruthy();
      expect(locale.dashboard.rescheduleTimeUnavailable).toBeTruthy();
      expect(locale.dashboard.rescheduleRecoveryHint).toBeTruthy();
      expect(locale.bookingModal.timeSlotRecoveryHint).toBeTruthy();
      expect(locale.dashboard.rescheduleSummary).toBeTruthy();
    }
  });

  it("keeps dashboard rescheduling guided, responsive, and stateful", () => {
    expect(dashboardBookingsSource).toContain("dashboard-reschedule-workspace");
    expect(dashboardBookingsSource).toContain("dashboard-reschedule-steps");
    expect(dashboardBookingsSource).toContain("dashboard-reschedule-status");
    expect(dashboardBookingsSource).toContain("aria-live=\"polite\"");
    expect(editorCssSource).toContain(".dashboard-reschedule-workspace");
    expect(editorCssSource).toContain(".dashboard-reschedule-steps");
    expect(editorCssSource).toContain(".dashboard-reschedule-status");
    expect(editorCssSource).toContain("grid-template-columns: minmax(0, 430px) minmax(280px, 1fr)");
    expect(sectionsCssSource).toContain("body:has(.dashboard-reschedule-panel) .mobile-bottom-nav");
    for (const locale of Object.values(locales)) {
      expect(locale.dashboard.reschedulePanelTitle).toBeTruthy();
      expect(locale.dashboard.rescheduleStepsLabel).toBeTruthy();
      expect(locale.dashboard.rescheduleStepReview).toBeTruthy();
      expect(locale.dashboard.rescheduleReadyHint).toBeTruthy();
      expect(locale.dashboard.rescheduleNoChangeHint).toBeTruthy();
    }
  });

  it("keeps booking date boundaries aligned with the studio business date", () => {
    expect(existsSync(businessDatePath)).toBe(true);
    expect(existsSync(bookingPolicyHookPath)).toBe(true);
    expect(existsSync(bookingPolicyApiPath)).toBe(true);
    const businessDateSource = existsSync(businessDatePath) ? readFileSync(businessDatePath, "utf8") : "";
    const bookingPolicyHookSource = existsSync(bookingPolicyHookPath) ? readFileSync(bookingPolicyHookPath, "utf8") : "";
    const bookingPolicyApiSource = existsSync(bookingPolicyApiPath) ? readFileSync(bookingPolicyApiPath, "utf8") : "";

    expect(businessDateSource).toContain("Asia/Shanghai");
    expect(bookingPolicyHookSource).toContain("/api/booking/policy");
    expect(bookingPolicyHookSource).toContain("fallbackPolicy");
    expect(bookingPolicyApiSource).toContain("getBookingPolicy");
    expect(bookingPolicyApiSource).toContain("cache-control");
    expect(bookingModalSource).toContain("useBookingPolicy");
    expect(bookingModalSource).not.toContain("getBusinessDate");
    expect(bookingModalSource).toContain('validateField("date"');
    expect(bookingCalendarSource).toContain("calendar.policyNote");
    expect(bookingCalendarSource).toContain("calendar.earliestBookable");
    expect(bookingCalendarSource).toContain("calendar.unavailableBefore");
    expect(dashboardBookingsSource).toContain("useBookingPolicy");
    expect(dashboardBookingsSource).toContain("isBookableBusinessDate");
    expect(dashboardBookingsSource).not.toContain("function getTodayString");
    for (const locale of Object.values(locales)) {
      expect(locale.calendar.policyNote).toBeTruthy();
      expect(locale.calendar.earliestBookable).toBeTruthy();
      expect(locale.calendar.unavailableBefore).toBeTruthy();
      expect(locale.bookingModal.datePast).toBeTruthy();
      expect(locale.dashboard.rescheduleDatePast).toBeTruthy();
    }
  });

  it("keeps booking availability capacity visible in calendars", () => {
    expect(availabilityApiSource).toContain("capacityPerDay");
    expect(availabilityApiSource).toContain("remaining");
    expect(bookingCalendarSource).toContain("calendar-day-capacity");
    expect(bookingCalendarSource).toContain("calendar.remainingSlots");
    expect(bookingCalendarSource).toContain("calendar.remainingShort");
    for (const locale of Object.values(locales)) {
      expect(locale.calendar.remainingSlots).toBeTruthy();
      expect(locale.calendar.remainingShort).toBeTruthy();
    }
  });

  it("keeps booking time-slot availability visible and enforced", () => {
    expect(bookingRulesSource).toContain("getBookingTimeSlotAvailability");
    expect(bookingRulesSource).toContain("isBookingTimeUnavailable");
    expect(bookingRulesSource).toContain("validateBookingTimeSlot");
    expect(availabilityApiSource).toContain("timeSlots");
    expect(bookingApiSource).toContain("time_unavailable");
    expect(bookingTimeSlotPickerSource).toContain("booking-time-slot-grid");
    expect(bookingModalSource).toContain("onSelectedDateInfoChange");
    expect(bookingModalSource).toContain("bookingModal.timeUnavailable");
    expect(sectionsCssSource).toContain(".booking-time-slot-grid");
    for (const locale of Object.values(locales)) {
      expect(locale.bookingModal.timeSlotAvailable).toBeTruthy();
      expect(locale.bookingModal.timeSlotUnavailable).toBeTruthy();
      expect(locale.bookingModal.timeUnavailable).toBeTruthy();
    }
  });

  it("keeps booking calendar policy, status, selection, and mobile hierarchy coherent", () => {
    expect(bookingCalendarSource).toContain("calendar-policy-strip");
    expect(bookingCalendarSource).toContain("calendar-status-strip");
    expect(bookingCalendarSource).toContain("calendar-selection-summary");
    expect(bookingCalendarSource).toContain("aria-pressed={isSelected}");
    expect(bookingCalendarSource).toContain("ChevronLeft");
    expect(bookingCalendarSource).toContain("CalendarDays");
    expect(editorCssSource).toContain(".calendar-status-count");
    expect(editorCssSource).not.toMatch(/\.booking-calendar\s*\{[^}]*max-width:\s*300px/s);
    for (const locale of Object.values(locales)) {
      expect(locale.calendar.selectedDate).toBeTruthy();
      expect(locale.calendar.selectedRemaining).toBeTruthy();
      expect(locale.calendar.monthStatus).toBeTruthy();
    }
  });

  it("keeps fully booked booking dates connected to the waitlist path", () => {
    expect(bookingApiSource).toContain("fully_booked");
    expect(bookingApiSource).toContain("waitlist");
    expect(waitlistApiSource).toContain("date_has_capacity");
    expect(waitlistApiSource).toContain("BOOKING_CAPACITY_PER_DAY");
    expect(bookingCalendarSource).toContain("onRequestWaitlist");
    expect(bookingCalendarSource).toContain("calendar-day-waitlist");
    expect(bookingModalSource).toContain("/api/booking/waitlist");
    expect(bookingModalSource).toContain("waitlistSuccessTitle");
    expect(editorCssSource).toContain(".booking-waitlist-notice");
    for (const locale of Object.values(locales)) {
      expect(locale.calendar.joinWaitlistShort).toBeTruthy();
      expect(locale.bookingModal.waitlistNoticeTitle).toBeTruthy();
      expect(locale.bookingModal.waitlistSuccessTitle).toBeTruthy();
    }
  });

  it("keeps repeat waitlist joins idempotent and user-visible", () => {
    expect(waitlistApiSource).toContain("already_waitlisted");
    expect(waitlistApiSource).toContain("duplicate: true");
    expect(bookingModalSource).toContain("waitlistAlreadyJoined");
    expect(bookingModalSource).toContain("waitlistAlreadyJoinedTitle");
    for (const locale of Object.values(locales)) {
      expect(locale.bookingModal.waitlistAlreadyJoinedTitle).toBeTruthy();
      expect(locale.bookingModal.waitlistAlreadyJoinedDescription).toBeTruthy();
    }
  });

  it("keeps booking completion states bridged to next actions", () => {
    expect(bookingModalSource).toContain("booking-success-bridge");
    expect(bookingModalSource).toContain("bookingModal.successBridgeTitle");
    expect(bookingModalSource).toContain("bookingModal.messageOnXiaohongshu");
    expect(bookingModalSource).toContain('to="/dashboard"');
    expect(sectionsCssSource).toContain(".booking-success-bridge");
    expect(sectionsCssSource).toMatch(/@media\s*\(max-width:\s*560px\)[\s\S]*\.booking-success-bridge-actions/);
    for (const locale of Object.values(locales)) {
      expect(locale.bookingModal.successBridgeTitle).toBeTruthy();
      expect(locale.bookingModal.successBridgeDashboardDetail).toBeTruthy();
      expect(locale.bookingModal.messageOnXiaohongshu).toBeTruthy();
      expect(locale.bookingModal.continueBrowsing).toBeTruthy();
    }
  });

  it("keeps post-booking status recovery connected through offline sync and dashboard login", () => {
    expect(offlineBookingSource).toContain("publicMutationHeaders");
    expect(offlineBookingSource).toContain("createPendingBookingRequestInit");
    expect(offlineBookingSource).toContain("getPendingBookingSyncDisposition");
    expect(offlineBookingSource).toContain("markBookingFailed");
    expect(offlineBookingSource).toContain('headers: { "Content-Type": "application/json", ...publicMutationHeaders }');
    expect(dashboardPageSource).toContain('to="/login?from=dashboard"');
    expect(loginPageSource).toContain("useLocation");
    expect(loginPageSource).toContain("loginRedirectTarget");
    expect(loginPageSource).toContain("dashboardLoginNoticeTitle");
    expect(loginPageSource).toContain("navigate(loginRedirectTarget, { replace: true })");
    expect(editorCssSource).toContain(".login-context-notice");
    for (const locale of Object.values(locales)) {
      expect(locale.auth.dashboardLoginNoticeTitle).toBeTruthy();
      expect(locale.auth.dashboardLoginNoticeDescription).toBeTruthy();
    }
  });

  it("keeps offline booking recovery global, actionable, localized, and outside the modal lifetime", () => {
    expect(rootLayoutSource).toContain('lazy(() => import("../components/OfflineBookingRecovery"))');
    expect(rootLayoutSource).toContain("<OfflineBookingRecovery isOnline={isOnline}");
    expect(offlineRecoverySource).toContain("syncPendingBookings");
    expect(offlineRecoverySource).toContain("PENDING_BOOKINGS_CHANGED_EVENT");
    expect(offlineRecoverySource).toContain("removePendingBooking");
    expect(offlineRecoverySource).toContain('aria-live="polite"');
    expect(bookingModalSource).not.toContain('window.addEventListener("online", handleOnline)');
    expect(bookingModalSource).toContain("offlineSaveError");
    expect(offlineFallbackSource).toContain("offlineStatus.offline");
    expect(cssSource).toContain(".offline-booking-recovery");
    expect(cssSource).toContain(".offline-booking-recovery-list");
    for (const locale of Object.values(locales)) {
      expect(locale.offlineStatus.offline).toBeTruthy();
      expect(locale.offlineStatus.online).toBeTruthy();
      expect(locale.offlineBookingRecovery.title).toBeTruthy();
      expect(locale.offlineBookingRecovery.syncNow).toBeTruthy();
      expect(locale.offlineBookingRecovery.remove).toBeTruthy();
      expect(locale.bookingModal.offlineSaveError).toBeTruthy();
    }
  });

  it("keeps the embedded dashboard calendar readable in dark mode", () => {
    const panelBlock = editorCssSource.match(/\.dashboard-confirm-panel--default\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    expect(panelBlock).toContain("--paper-white: #fffdf7");
    expect(panelBlock).toContain("--caramel-ink: #3f2f27");
  });

  it("keeps the customer booking dashboard scannable and responsive", () => {
    expect(dashboardBookingsSource).toContain("dashboard-booking-overview");
    expect(dashboardBookingsSource).toContain("getStatusHelpKey");
    expect(dashboardBookingsSource).toContain("dashboard-status-insight");
    expect(dashboardBookingsSource).toContain('aria-live="polite"');
    expect(editorCssSource).toContain(".dashboard-booking-overview");
    expect(editorCssSource).toContain(".dashboard-booking-schedule");
    expect(editorCssSource).toContain(".dashboard-status-insight");
    expect(editorCssSource).toContain(".dashboard-reschedule-actions .ai-btn");
    expect(editorCssSource).toContain("padding-bottom: calc(24px + var(--mobile-bottom-nav-offset, 0px))");
    expect(sectionsCssSource).toContain(".site-nav .nav-user-btn span");
  });

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

  it("does not silently swallow client storage recovery failures", () => {
    expect(resilientClientStorageSources).not.toContain("} catch {}");
    expect(resilientClientStorageSources).toContain("logAndIgnore");
  });

  it("keeps diagnostics for non-critical async background failures", () => {
    const backgroundFailureSources = [
      errorLoggerSource,
      photosMapperSource,
      adminPhotosApiSource,
      adminPhotoApiSource,
      adminPhotosBatchApiSource,
      pwaUpdateBannerSource,
      prefetchLinkSource,
    ].join("\n");

    expect(backgroundFailureSources).not.toContain(".catch(() => {})");
    expect(backgroundFailureSources).not.toContain(".catch(() => undefined)");
    expect(backgroundFailureSources).not.toContain("Silently fail");
    expect(backgroundFailureSources).toContain("logAndIgnore");
    expect(backgroundFailureSources).toContain("logWorkerError");
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
    expect(redirectsSource).not.toContain("/index.html 200");
    expect(redirectsSource).not.toContain("/* /index.html");
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

  it("keeps GitHub Actions on Node 24 compatible action runtimes", () => {
    expect(ciWorkflowSource).toContain("actions/checkout@v5");
    expect(ciWorkflowSource).toContain("actions/setup-node@v6");
    expect(ciWorkflowSource).toContain("node-version: 24");
    expect(packageSource).toContain('"node": ">=22.0.0"');
    expect(ciWorkflowSource).not.toContain("actions/checkout@v4");
    expect(ciWorkflowSource).not.toContain("actions/setup-node@v4");
    expect(ciWorkflowSource).not.toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24");
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
    expect(adminSource).toContain('fetch("/api/admin/photos", { method: "POST", body: fd, credentials: "include", headers: adminMutationHeaders })');
    expect(adminSource).toContain('fetch("/api/admin/session", { method: "DELETE", credentials: "include", headers: adminMutationHeaders })');
    expect(adminSessionApiSource).toContain("isAdminMutationRequest");
    expect(adminSource).toContain("allowedPhotoTypes");
    expect(adminSource).toContain("maxPhotoUploadSize");
  });

  it("keeps admin moderation bulk approval wired to all pending ids", () => {
    expect(adminModerationQueueSource).toContain("const idsToApprove = selectedIds.size > 0");
    expect(adminModerationQueueSource).toContain("pendingPhotos.map((photo) => photo.id)");
    expect(adminModerationQueueSource).toContain("ids: idsToApprove");
    expect(adminModerationQueueSource).toContain("if (idsToApprove.length === 0) return;");
  });

  it("routes destructive photo batches through one confirmed server operation", () => {
    expect(adminPhotosBatchApiSource).toContain('"visibility" | "featured" | "album" | "delete"');
    expect(adminPhotosBatchApiSource).toContain("deletePhotosWithConsistency");
    expect(adminModerationQueueSource).toContain('action: "delete"');
    expect(adminModerationQueueSource).toContain("admin-moderation-reject-confirmation");
    expect(adminPhotosSource).toContain('action: "delete"');
    expect(adminPhotosSource).toContain("const deletedIds = new Set(result.ids)");
  });

  it("keeps preset download count writes behind the public page-action boundary", () => {
    expect(presetDownloadApiSource).toContain("requirePublicMutationRequest");
    expect(productsPageSource).toContain("publicMutationHeaders");
    expect(productsPageSource).toContain("headers: publicMutationHeaders");
    expect(presetDetailPageSource).toContain("publicMutationHeaders");
    expect(presetDetailPageSource).toContain("headers: publicMutationHeaders");
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

  it("keeps public auth mutations behind the page action header", () => {
    for (const source of [
      loginApiSource,
      registerApiSource,
      forgotPasswordApiSource,
      resetPasswordApiSource,
      logoutApiSource,
    ]) {
      expect(source).toContain("requirePublicMutationRequest");
    }
    expect(useAuthSource).toContain("publicMutationHeaders");
    expect(useAuthSource).toMatch(/headers:\s*\{\s*"Content-Type":\s*"application\/json",\s*\.\.\.publicMutationHeaders\s*\}/);
    expect(loginPageSource).toContain("publicMutationHeaders");
  });

  it("keeps placeholder booking deposits truthful from submission to dashboard", () => {
    const paymentForm = readFileSync(resolve(root, "src/components/PaymentForm.tsx"), "utf8");
    const bookingModal = readFileSync(resolve(root, "src/components/BookingModal.tsx"), "utf8");
    const bookingsTab = readFileSync(resolve(root, "src/components/dashboard/BookingsTab.tsx"), "utf8");
    const bookingApi = readFileSync(resolve(root, "functions/api/user/bookings.ts"), "utf8");
    const sectionStyles = readFileSync(resolve(root, "src/styles/sections.css"), "utf8");

    expect(paymentForm).toContain('provider === "placeholder"');
    expect(paymentForm).toContain("payment.pendingTitle");
    expect(paymentForm).not.toContain('placeholder="4242 4242 4242 4242"');
    expect(bookingModal).toContain("setSavedOffline(true)");
    expect(bookingModal).toContain("depositOutcome");
    expect(bookingsTab).toContain("dashboard.bookingDeposit");
    expect(bookingsTab).toContain("payment_status");
    expect(bookingApi).toContain("payment_intents");
    expect(sectionStyles).toContain("body:has(.booking-modal-content) .mobile-bottom-nav");
    expect(sectionStyles).toContain("body:has(.booking-modal-content) .public-chat-widget");
  });

  it("keeps booking completion payment clarity visible and mobile-safe", () => {
    const bookingModal = readFileSync(resolve(root, "src/components/BookingModal.tsx"), "utf8");
    const sectionStyles = readFileSync(resolve(root, "src/styles/sections.css"), "utf8");

    expect(bookingModal).toContain("bookingPaymentClaritySteps");
    expect(bookingModal).toContain("booking-payment-clarity");
    expect(bookingModal).toContain("booking-payment-clarity-step");
    expect(bookingModal).toContain('aria-label={t("bookingModal.paymentClarityLabel"');
    expect(bookingModal).toContain("bookingModal.paymentClarity.notCharged");
    expect(sectionStyles).toContain(".booking-payment-clarity");
    expect(sectionStyles).toContain(".booking-payment-clarity-steps");
    expect(sectionStyles).toMatch(/@media\s*\(max-width:\s*560px\)[\s\S]*\.booking-payment-clarity/s);
    for (const locale of Object.values(locales)) {
      expect(locale.bookingModal.paymentClarityLabel).toBeTruthy();
      expect(locale.bookingModal.paymentClarity.saved).toBeTruthy();
      expect(locale.bookingModal.paymentClarity.notCharged).toBeTruthy();
      expect(locale.bookingModal.paymentClarity.followUp).toBeTruthy();
    }
  });

  it("surfaces payment readiness and deposit tracking to customers and admins", () => {
    const paymentForm = readFileSync(resolve(root, "src/components/PaymentForm.tsx"), "utf8");

    expect(paymentCreateIntentSource).toContain("buildPaymentReadiness");
    expect(paymentCreateIntentSource).toContain("manual_follow_up");
    expect(paymentCreateIntentSource).toContain("STRIPE_SECRET_KEY");
    expect(paymentForm).toContain("payment.readinessTitle");
    expect(paymentForm).toContain("readiness.nextAction");
    expect(adminBookingsApiSource).toContain("payment_intents");
    expect(adminBookingsApiSource).toContain("payment_status");
    expect(adminBookingsSource).toContain("adm-booking-payment");
    expect(adminBookingsSource).toContain("formatPaymentAmount");
  });

  it("keeps payment confirmation states safe and webhook handling idempotent", () => {
    const paymentForm = readFileSync(resolve(root, "src/components/PaymentForm.tsx"), "utf8");

    expect(paymentConfirmSource).toContain("normalizeStoredPaymentStatus");
    expect(paymentConfirmSource).toContain("toClientConfirmationStatus");
    expect(paymentConfirmSource).toContain("nextAction");
    expect(paymentWebhookSource).toContain("idempotent: true");
    expect(paymentWebhookSource).toContain("existingStatus === normalizedStatus");
    expect(paymentWebhookSource).toContain("charge.refunded");
    expect(paymentWebhookSource).toContain("refunded");
    expect(paymentWebhookSource).toContain("buildRefundMetadata");
    expect(adminBookingsSource).toContain('"refunded"');
    expect(dashboardBookingsSource).toContain("dashboard.paymentStatus");
    expect(editorCssSource).toContain(".dashboard-booking-deposit--refunded");
    expect(adminCssSource).toContain(".adm-booking-payment--refunded");
    expect(paymentForm).toContain('outcome === "pending"');
    expect(paymentForm).toContain("payment.cancelledDesc");
    for (const locale of Object.values(locales)) {
      expect(locale.dashboard.paymentStatus.refunded).toBeTruthy();
    }
  });

  it("keeps refund reconciliation in a dedicated ledger and visible to admins", () => {
    expect(businessMigrationSource).toContain("create table if not exists payment_refunds");
    expect(businessMigrationSource).toContain("unique (charge_id)");
    expect(businessMigrationSource).toContain("idx_payment_refunds_intent");
    expect(paymentWebhookSource).toContain("recordRefundLedgerEntry");
    expect(paymentWebhookSource).toContain("INSERT INTO payment_refunds");
    expect(paymentWebhookSource).toContain("ON CONFLICT(charge_id)");
    expect(adminBookingsApiSource).toContain("payment_refunds");
    expect(adminBookingsApiSource).toContain("refund_amount_cents");
    expect(adminBookingsSource).toContain("adm-booking-refund");
    expect(adminBookingsSource).toContain("admin.bookings.refundLedger");
    expect(adminBookingsSource).toContain("admin.bookings.refundReference");
    expect(adminCssSource).toContain(".adm-booking-refund");
    for (const locale of Object.values(locales)) {
      expect(locale.admin.bookings.refundLedger).toBeTruthy();
      expect(locale.admin.bookings.refundReference).toBeTruthy();
      expect(locale.admin.bookings.refundReceivedAt).toBeTruthy();
    }
  });

  it("keeps payment status UX explicit and mobile-safe", () => {
    const paymentForm = readFileSync(resolve(root, "src/components/PaymentForm.tsx"), "utf8");

    expect(paymentForm).toContain("payment-status-track");
    expect(paymentForm).toContain("payment.followUpTitle");
    expect(paymentForm).toContain("payment.pendingNextStep");
    expect(paymentForm).toContain("payment.continueWithoutPaying");
    expect(editorCssSource).toContain(".payment-status-track");
    expect(editorCssSource).toContain(".payment-status-step");
    expect(editorCssSource).toMatch(/\.payment-failed-actions\s*\{[\s\S]*flex-wrap:\s*wrap/s);
    expect(editorCssSource).toMatch(/@media\s*\(max-width:\s*560px\)[\s\S]*\.payment-form-actions/s);
    for (const locale of Object.values(locales)) {
      expect(locale.payment.followUpTitle).toBeTruthy();
      expect(locale.payment.pendingNextStep).toBeTruthy();
      expect(locale.payment.continueWithoutPaying).toBeTruthy();
    }
  });

  it("keeps course and workshop payment entries aligned with pending/manual follow-up semantics", () => {
    const courseDetailSource = readFileSync(resolve(root, "src/pages/CourseDetailPage.tsx"), "utf8");
    const workshopDetailSource = readFileSync(resolve(root, "src/pages/WorkshopDetailPage.tsx"), "utf8");

    expect(courseDetailSource).toContain("onPending");
    expect(courseDetailSource).toContain("courseDetail.paymentPendingTitle");
    expect(courseDetailSource).toContain("course-payment-status-note");
    expect(workshopDetailSource).toContain("onPending");
    expect(workshopDetailSource).toContain("workshopDetail.paymentPendingTitle");
    expect(workshopDetailSource).toContain("workshop-payment-status-note");
    expect(editorCssSource).toContain(".course-payment-status-note");
    expect(editorCssSource).toContain(".workshop-payment-status-note");
    for (const locale of Object.values(locales)) {
      expect(locale.courseDetail.paymentPendingTitle).toBeTruthy();
      expect(locale.courseDetail.paymentPendingDesc).toBeTruthy();
      expect(locale.workshopDetail.paymentPendingTitle).toBeTruthy();
      expect(locale.workshopDetail.paymentPendingDesc).toBeTruthy();
    }
  });

  it("keeps admin booking payment status labels aligned with customer dashboard status labels", () => {
    expect(adminBookingsSource).toContain("useTranslation");
    expect(adminBookingsSource).toContain("dashboard.paymentStatus");
    expect(adminBookingsSource).not.toContain("paymentStatusLabels");
    expect(adminCssSource).toContain(".adm-booking-payment--pending");
    expect(adminCssSource).toContain(".adm-booking-payment--processing");
  });

  it("keeps admin booking payment follow-up copy localized", () => {
    expect(adminBookingsSource).toContain("admin.bookings.amountPending");
    expect(adminBookingsSource).toContain("admin.bookings.paymentProvider");
    expect(adminBookingsSource).toContain("admin.bookings.waitingForPaymentConfirmation");
    expect(adminBookingsSource).not.toContain("渠道：");
    expect(adminBookingsSource).not.toContain("等待用户确认");
    for (const locale of Object.values(locales)) {
      expect(locale.admin.bookings.amountPending).toBeTruthy();
      expect(locale.admin.bookings.paymentProvider).toBeTruthy();
      expect(locale.admin.bookings.waitingForPaymentConfirmation).toBeTruthy();
    }
  });

  it("keeps admin payment follow-up queue filterable by payment status", () => {
    expect(adminBookingsSource).toContain("paymentFilter");
    expect(adminBookingsSource).toContain("paymentStatusCounts");
    expect(adminBookingsSource).toContain("filteredBookings");
    expect(adminBookingsSource).toContain("admin.bookings.paymentFilterAll");
    expect(adminBookingsSource).toContain("admin.bookings.paymentFollowUpQueue");
    expect(adminCssSource).toContain(".adm-booking-payment-summary");
    expect(adminCssSource).toContain(".adm-booking-payment-filter");
    expect(adminCssSource).toContain(".adm-booking-payment-filter.is-active");
    for (const locale of Object.values(locales)) {
      expect(locale.admin.bookings.paymentFilterAll).toBeTruthy();
      expect(locale.admin.bookings.paymentFollowUpQueue).toBeTruthy();
    }
  });

  it("keeps Stripe live-readiness documented and surfaced to admins without secret values", () => {
    expect(existsSync(paymentLiveReadinessPath)).toBe(true);
    expect(paymentLiveReadinessSource).toContain("Payment Element");
    expect(paymentLiveReadinessSource).toContain("STRIPE_SECRET_KEY");
    expect(paymentLiveReadinessSource).toContain("STRIPE_WEBHOOK_SECRET");
    expect(paymentLiveReadinessSource).toContain("payment_intent.succeeded");
    expect(paymentLiveReadinessSource).toContain("payment_intent.payment_failed");
    expect(paymentLiveReadinessSource).toContain("charge.refunded");
    expect(paymentLiveReadinessSource).toContain("`refunded`");
    expect(paymentLiveReadinessSource).toContain("rollback");
    expect(paymentLiveReadinessSource).toContain("manual follow-up");
    expect(paymentLiveReadinessSource).not.toMatch(/sk_live_[A-Za-z0-9]/);
    expect(paymentLiveReadinessSource).not.toMatch(/whsec_[A-Za-z0-9]/);
    expect(adminBookingsSource).toContain("paymentReadinessItems");
    expect(adminBookingsSource).toContain("admin.bookings.paymentReadinessTitle");
    expect(adminBookingsSource).toContain("adm-payment-readiness");
    expect(adminCssSource).toContain(".adm-payment-readiness");
    for (const locale of Object.values(locales)) {
      expect(locale.admin.bookings.paymentReadinessTitle).toBeTruthy();
      expect(locale.admin.bookings.paymentReadinessStripeKeys).toBeTruthy();
      expect(locale.admin.bookings.paymentReadinessWebhook).toBeTruthy();
      expect(locale.admin.bookings.paymentReadinessRefunds).toBeTruthy();
    }
  });

  it("keeps the dashboard workspace readable and actionable across breakpoints", () => {
    const dashboardPage = readFileSync(resolve(root, "src/pages/DashboardPage.tsx"), "utf8");
    const workspacePath = resolve(root, "src/components/dashboard/DashboardWorkspace.tsx");
    const wrapper = readFileSync(resolve(root, "src/components/dashboard/DashboardTabWrapper.tsx"), "utf8");
    const overview = readFileSync(resolve(root, "src/components/dashboard/OverviewTab.tsx"), "utf8");
    const pageStyles = readFileSync(resolve(root, "src/styles/pages.css"), "utf8");

    expect(existsSync(workspacePath)).toBe(true);
    if (!existsSync(workspacePath)) return;
    const workspace = readFileSync(workspacePath, "utf8");

    expect(dashboardPage).toContain("<DashboardWorkspace");
    expect(workspace).toContain('role="tablist"');
    expect(workspace).toContain("aria-selected");
    expect(workspace).toContain('event.key === "ArrowRight"');
    expect(workspace).toContain('event.key === "Home"');
    expect(wrapper).toContain("emptyAction");
    expect(wrapper).toContain("dashboard-empty-action");
    expect(overview).toContain("overview-start-panel");
    expect(pageStyles).toContain(".dashboard-workspace-nav");
    expect(pageStyles).toContain("overflow-x: auto");
    expect(pageStyles).toContain("body:has(.dashboard-root) .public-chat-widget");
    expect(pageStyles).toContain("body:has(.dashboard-root) .nhb-scroll-top");
  });

  it("keeps the mobile dashboard first viewport compact and action-oriented", () => {
    const dashboardPage = readFileSync(resolve(root, "src/pages/DashboardPage.tsx"), "utf8");
    const pageStyles = readFileSync(resolve(root, "src/styles/pages.css"), "utf8");

    expect(dashboardPage).toContain("dashboard-hero");
    expect(dashboardPage).toContain("dashboard-profile-shortcuts");
    expect(dashboardPage).toContain('aria-label={t("dashboard.profileShortcuts"');
    expect(dashboardPage).toContain('to="/booking"');
    expect(dashboardPage).toContain('to="/gallery"');
    expect(dashboardPage).toContain('to="/editor"');
    expect(pageStyles).toMatch(/\.dashboard-hero\s*\{[\s\S]*min-height:\s*clamp\(190px,\s*32svh,\s*320px\)/);
    expect(pageStyles).toContain(".dashboard-profile-shortcuts");
    expect(pageStyles).toContain(".dashboard-profile-shortcut");
    expect(pageStyles).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.dashboard-hero\s*\{[\s\S]*min-height:\s*clamp\(150px,\s*24svh,\s*220px\)/);
  });

  it("documents required Cloudflare secrets without committing secret values", () => {
    expect(wranglerSource).toContain("Required Pages secrets");
    expect(readmeSource).toContain("AUTH_SECRET");
    expect(readmeSource).toContain("RATE_LIMIT_SECRET");
    expect(readmeSource).toContain("RESEND_API_KEY");
    expect(readmeSource).toContain("RESET_EMAIL_FROM");
    expect(readmeSource).toContain("wrangler pages secret put AUTH_SECRET");
    expect(readmeSource).toContain("wrangler pages secret put ADMIN_PASSWORD");
    expect(wranglerSource).not.toMatch(/\[vars\][\s\S]*AUTH_SECRET/);
    expect(readmeSource).not.toMatch(/AUTH_SECRET\s*=\s*['"][^'"]+['"]/);
  });

  it("sends password reset mail when Resend is configured", () => {
    expect(forgotPasswordApiSource).toContain("https://api.resend.com/emails");
    expect(forgotPasswordApiSource).toContain("RESET_EMAIL_FROM");
    expect(forgotPasswordApiSource).not.toContain("TODO: Send email");
  });

  it("applies shared security headers to API JSON and photo object responses", () => {
    for (const header of [
      "x-content-type-options",
      "x-frame-options",
      "strict-transport-security",
      "referrer-policy",
      "permissions-policy",
      "content-security-policy",
    ]) {
      expect(responsesSource).toContain(header);
    }
    expect(responsesSource).toContain("withSecurityHeaders");
    expect(photoDownloadApiSource).toContain("withSecurityHeaders");
    expect(photoImageApiSource).toContain("withSecurityHeaders");
    expect(publicChatApiSource).toContain("jsonResponse");
    expect(publicChatApiSource).not.toContain("function json(");
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

  it("does not keep unused admin context architecture around", () => {
    expect(existsSync(resolve(root, "src/components/admin/AdminContext.tsx"))).toBe(false);
    expect(adminSource).not.toContain("AdminCtx");
    expect(adminSource).not.toContain("useAdmin");
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

  it("does not pass undefined Leaflet event handlers from custom map markers", () => {
    expect(customMarkerSource).toContain("const markerEventHandlers = onClick ? { click: onClick } : undefined");
    expect(customMarkerSource).toContain("eventHandlers={markerEventHandlers}");
    expect(customMarkerSource).not.toContain("eventHandlers={{ click: onClick }}");
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
    expect(gallerySource).toContain('removeEventListener("touchend"');
    expect(gallerySource).toContain('removeEventListener("touchmove"');
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
    expect(seoSource).toContain("${metadata.origin}/?lang=en");
    expect(seoSource).not.toContain("https://shoot.custard.top/?lang=en");
    expect(i18nSource).toContain('new URLSearchParams(window.location.search).get("lang")');
    expect(i18nSource).toContain("supportedLanguages");
    expect(i18nSource).not.toContain('localStorage.setItem("lang", queryLang)');
  });

  it("sets the document language before React hydrates", () => {
    expect(htmlSource).toContain("supportedLang");
    expect(htmlSource).toContain("document.documentElement.lang");
    expect(htmlSource).toContain("localStorage.getItem('lang')");
  });

  it("pauses decorative loops when idle or after viewport capability changes", () => {
    expect(customCursorSource).toContain("startLoop");
    expect(customCursorSource).toContain("idleTimer.current >= 300");
    expect(customCursorSource).toContain("running = false");
    expect(filmGrainSource).toContain("setCapability");
    expect(filmGrainSource).toContain("addEventListener(\"resize\"");
    expect(filmGrainSource).toContain("[capability]");
  });

  it("keeps editor controls below the fixed navigation while scrolling", () => {
    expect(editorCssSource).toMatch(/\.editor-toolbar\s*\{[\s\S]*position:\s*sticky/s);
    expect(editorCssSource).toMatch(/\.editor-toolbar\s*\{[\s\S]*top:\s*calc\(var\(--nav-h,\s*64px\)/s);
    expect(editorCssSource).toMatch(/\.editor-toolbar\s+\.editor-btn\s*\{[\s\S]*scroll-margin-top:\s*calc\(var\(--nav-h,\s*64px\)/s);
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

  it("keeps PWA updates user-visible and clears outdated app-shell caches", () => {
    expect(viteConfigSource).toContain('registerType: "prompt"');
    expect(viteConfigSource).toContain("cleanupOutdatedCaches: true");
    expect(pwaUpdateBannerSource).toContain("const registration = registrationRef.current");
    expect(pwaUpdateBannerSource).toContain("!registration?.installing && !registration?.waiting && !registration?.active");
    expect(pwaUpdateBannerSource).toContain("registration.update()");
    expect(pwaUpdateBannerSource).toContain("UPDATE_CHECK_INTERVAL_MS");
    expect(pwaUpdateBannerSource).toContain("navigator.serviceWorker.getRegistration()");
    expect(pwaUpdateBannerSource).toContain("window.setInterval(checkForUpdate");
    expect(pwaUpdateBannerSource).toContain("window.addEventListener(\"online\", checkForUpdate)");
    expect(pwaUpdateBannerSource).toContain("visibilitychange");
    expect(pwaUpdateBannerSource).toContain("removeEventListener(\"updatefound\"");
    expect(pwaUpdateBannerSource).toContain("{ type: \"SKIP_WAITING\" }");
    expect(pwaUpdateBannerSource).toContain("pwaUpdate.refreshing");
    expect(zhLocaleSource).toContain("正在刷新到最新版本");
    expect(enLocaleSource).toContain("Refreshing to the latest version");
  });

  it("removes the exact media-query listener used for system theme changes", () => {
    expect(themeToggleSource).toContain("const onChange = (event: MediaQueryListEvent)");
    expect(themeToggleSource).toContain('mq.addEventListener("change", onChange)');
    expect(themeToggleSource).toContain('mq.removeEventListener("change", onChange)');
  });

  it("keeps photo API runtime cache from being shadowed by broader API routes", () => {
    const apiDataRoute = viteConfigSource.match(/return [\s\S]*?cacheName: "api-data"/)?.[0] ?? "";
    expect(apiDataRoute).not.toContain('url.pathname.startsWith("/api/photos")');
    expect(viteConfigSource).toContain('cacheName: "api-photos"');
    expect(viteConfigSource).toContain('maxEntries: 1');
  });

  it("keeps PWA update banner keyboard accessible with focus and escape handling", () => {
    expect(pwaUpdateBannerSource).toContain('role="alertdialog"');
    expect(pwaUpdateBannerSource).toContain("aria-describedby");
    expect(pwaUpdateBannerSource).toContain("refreshButtonRef");
    expect(pwaUpdateBannerSource).toContain('event.key === "Escape"');
    expect(pwaUpdateBannerSource).toContain("previouslyFocused");
  });

  it("keeps client error reporting persistent and admin-visible", () => {
    expect(errorTrackerSource).toContain('endpoint: "/api/analytics/error"');
    expect(analyticsErrorApiSource).toContain("client_error_reports");
    expect(schemaSource).toContain("create table if not exists client_error_reports");
    expect(adminErrorsApiSource).toContain("from client_error_reports");
    expect(adminSource).toContain("AdminErrorReportsTab");
    expect(adminErrorReportsSource).toContain("/api/admin/errors");
    expect(adminErrorReportsSource).toContain("adminMutationHeaders");
    expect(adminErrorReportsSource).toContain('status=${statusFilter}');
    expect(adminErrorWorkflowApiSource).toContain("update client_error_reports");
    expect(enLocaleSource).toContain("Error reports");
    expect(zhLocaleSource).toContain("前端错误报告");
  });

  it("keeps admin error triage usable on narrow screens", () => {
    expect(adminSource).toContain('<nav className="adm-tabs"');
    expect(adminSource).toContain('aria-current={activeTab === item.key ? "page" : undefined}');
    expect(adminErrorReportsSource).toContain('role="status"');
    expect(adminErrorReportsSource).toContain('data-label={t("admin.errors.colStatus"');
    expect(adminCssSource).toContain(".adm-errors-table thead { display: none; }");
    expect(adminCssSource).toContain(".adm-errors-table tr { display: grid;");
  });

  it("keeps repeated admin errors grouped and bulk-actionable", () => {
    expect(adminErrorsApiSource).toContain("occurrenceCount");
    expect(adminErrorsApiSource).toContain("groupKey");
    expect(adminErrorWorkflowApiSource).toContain('scope === "group"');
    expect(adminErrorWorkflowApiSource).toContain("where status = 'open'");
    expect(adminErrorWorkflowApiSource).toContain("Client error report not found");
    expect(adminErrorWorkflowApiSource).toContain("changedRows(result) === 0");
    expect(adminErrorReportsSource).toContain("occurrenceCount");
    expect(adminErrorReportsSource).toContain('updateStatus(report, "resolved", "group")');
    expect(adminErrorReportsSource).toContain("adm-errors-count");
    expect(adminCssSource).toContain(".adm-errors-count");
  });

  it("keeps the gallery route from rendering duplicate gallery landmarks", () => {
    expect(gallerySource).toContain('id="gallery"');
    expect(galleryPageSource).not.toContain('id="gallery"');
  });
});
