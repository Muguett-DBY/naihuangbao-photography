import type { TFunction } from "i18next";

/**
 * Typed translation helpers for dynamic keys.
 * These eliminate `as any` casts by using pre-defined union types
 * for category/difficulty/status values.
 */

// Course categories and difficulties
type CourseCategory = "beginner" | "advanced" | "post-processing" | "posing";
type CourseDifficulty = "beginner" | "intermediate" | "advanced";

// Preset categories
type PresetCategory = "portrait" | "landscape" | "film" | "bw" | "vintage";

// Merchandise categories
type MerchandiseCategory = "album" | "print" | "frame" | "accessory";

// Workshop statuses
type WorkshopStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

// Dashboard booking statuses
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

/**
 * Translate a course category key.
 * Usage: {tCourseCategory(t, course.category)}
 */
export function tCourseCategory(t: TFunction, category: string): string {
  return t(`courses.categories.${category}` as any);
}

/**
 * Translate a course difficulty key.
 * Usage: {tCourseDifficulty(t, course.difficulty)}
 */
export function tCourseDifficulty(t: TFunction, difficulty: string): string {
  return t(`courses.difficulty.${difficulty}` as any);
}

/**
 * Translate a preset category key.
 * Usage: {tPresetCategory(t, preset.category)}
 */
export function tPresetCategory(t: TFunction, category: string): string {
  return t(`presets.categories.${category}` as any);
}

/**
 * Translate a merchandise category key.
 * Usage: {tMerchandiseCategory(t, item.category)}
 */
export function tMerchandiseCategory(t: TFunction, category: string): string {
  return t(`merchandise.categories.${category}` as any);
}

/**
 * Translate a workshop status key.
 * Usage: {tWorkshopStatus(t, workshop.status)}
 */
export function tWorkshopStatus(t: TFunction, status: string): string {
  return t(`dashboard.status.${status}` as any);
}
