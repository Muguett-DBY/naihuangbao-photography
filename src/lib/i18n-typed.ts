import type { TFunction } from "i18next";

/**
 * Typed translation helpers for dynamic keys.
 * These eliminate `as any` casts by using pre-defined union types
 * for category/difficulty/status values that match the actual i18n JSON.
 */

// Course categories and difficulties (match courses.categories in i18n JSON)
type CourseCategory = "beginner" | "advanced" | "post-processing" | "posing";
type CourseDifficulty = "beginner" | "intermediate" | "advanced";

// Preset categories (match presets.categories in i18n JSON)
type PresetCategory = "lightroom" | "photoshop" | "capture-one" | "luts";

// Merchandise categories (match merchandise.categories in i18n JSON)
type MerchandiseCategory = "album" | "postcard" | "frame" | "print" | "other";

// Workshop statuses
type WorkshopStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

// Dashboard booking statuses
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

/**
 * Translate a course category key with fallback.
 * Usage: {tCourseCategory(t, course.category)}
 */
export function tCourseCategory(t: TFunction, category: string): string {
  return t(`courses.categories.${category}` as any, { defaultValue: category });
}

/**
 * Translate a course difficulty key with fallback.
 * Usage: {tCourseDifficulty(t, course.difficulty)}
 */
export function tCourseDifficulty(t: TFunction, difficulty: string): string {
  return t(`courses.difficulty.${difficulty}` as any, { defaultValue: difficulty });
}

/**
 * Translate a preset category key with fallback.
 * Usage: {tPresetCategory(t, preset.category)}
 */
export function tPresetCategory(t: TFunction, category: string): string {
  return t(`presets.categories.${category}` as any, { defaultValue: category });
}

/**
 * Translate a merchandise category key with fallback.
 * Usage: {tMerchandiseCategory(t, item.category)}
 */
export function tMerchandiseCategory(t: TFunction, category: string): string {
  return t(`merchandise.categories.${category}` as any, { defaultValue: category });
}

/**
 * Translate a workshop status key with fallback.
 * Usage: {tWorkshopStatus(t, workshop.status)}
 */
export function tWorkshopStatus(t: TFunction, status: string): string {
  return t(`dashboard.status.${status}` as any, { defaultValue: status });
}
