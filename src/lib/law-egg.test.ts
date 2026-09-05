import { describe, expect, it } from "vitest";
import { checkEasterEggPure, type EggCheckContext } from "./law-egg";

const base: EggCheckContext = {
  now: new Date(2026, 8, 5, 14, 0), // 2026-09-05 14:00（非凌晨/清晨/平安夜，距考>30天）
  doneCount: 0,
  streakDays: 0,
  wrongLessons: 0,
  daysLeft: 112,
  unlocked: {},
};

const at = (month: number, day: number, hour: number): EggCheckContext => ({
  ...base,
  now: new Date(2026, month - 1, day, hour, 0),
});

describe("law egg triggers", () => {
  it("quiet afternoon triggers nothing", () => {
    expect(checkEasterEggPure(base)).toBeNull();
  });

  it("christmas eve letter only on 12/25", () => {
    expect(checkEasterEggPure(at(12, 25, 14))).toBe("christmas");
    expect(checkEasterEggPure(at(12, 24, 14))).toBeNull();
    expect(checkEasterEggPure(at(12, 26, 14))).toBeNull();
  });

  it("midnight letter at 23:00-04:59", () => {
    expect(checkEasterEggPure(at(9, 5, 23))).toBe("midnight");
    expect(checkEasterEggPure(at(9, 5, 2))).toBe("midnight");
    expect(checkEasterEggPure(at(9, 5, 5))).not.toBe("midnight");
  });

  it("morning letter at 05:00-08:59", () => {
    expect(checkEasterEggPure(at(9, 5, 5))).toBe("morning");
    expect(checkEasterEggPure(at(9, 5, 8))).toBe("morning");
    expect(checkEasterEggPure(at(9, 5, 9))).toBeNull();
  });

  it("exam30 triggers within 30 days of the exam", () => {
    expect(checkEasterEggPure({ ...base, daysLeft: 112 })).toBeNull();
    expect(checkEasterEggPure({ ...base, daysLeft: 30 })).toBe("exam30");
    expect(checkEasterEggPure({ ...base, daysLeft: 1 })).toBe("exam30");
  });

  it("milestone letters for first lesson, hundredth, streak and wrong book", () => {
    expect(checkEasterEggPure({ ...base, doneCount: 1 })).toBe("firstLesson");
    expect(checkEasterEggPure({ ...base, doneCount: 2 })).toBeNull();
    expect(checkEasterEggPure({ ...base, doneCount: 100 })).toBe("hundred");
    expect(checkEasterEggPure({ ...base, streakDays: 3 })).toBe("streak3");
    expect(checkEasterEggPure({ ...base, streakDays: 2 })).toBeNull();
    expect(checkEasterEggPure({ ...base, wrongLessons: 3 })).toBe("wrongbook3");
    expect(checkEasterEggPure({ ...base, wrongLessons: 2 })).toBeNull();
  });

  it("date letters take priority over milestones", () => {
    // 平安夜当天深夜 + 首课同触 → 取圣诞
    const ctx: EggCheckContext = { ...at(12, 25, 23), doneCount: 1 };
    expect(checkEasterEggPure(ctx)).toBe("christmas");
  });

  it("already-unlocked eggs never re-fire", () => {
    const ctx: EggCheckContext = { ...at(9, 5, 6), unlocked: { morning: true } };
    expect(checkEasterEggPure(ctx)).toBeNull();
  });

  it("falls through priority to the next available egg", () => {
    // 深夜但 midnight 已解锁，首课达成 → 给 firstLesson
    const ctx: EggCheckContext = { ...at(9, 5, 23), doneCount: 1, unlocked: { midnight: true } };
    expect(checkEasterEggPure(ctx)).toBe("firstLesson");
  });
});
