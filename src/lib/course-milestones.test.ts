import { describe, expect, it } from "vitest";
import {
  COURSE_MILESTONES,
  getEarnedMilestones,
  getMilestoneProgress,
  getNextMilestone,
} from "./course-milestones";

describe("course milestones", () => {
  it("exposes five canonical milestones at expected thresholds", () => {
    expect(COURSE_MILESTONES).toHaveLength(5);
    expect(COURSE_MILESTONES.map((m) => m.threshold)).toEqual([0, 25, 50, 75, 100]);
  });

  it("returns earned milestones in threshold order", () => {
    const earned = getEarnedMilestones(60);
    expect(earned.map((m) => m.id)).toEqual(["milestone-start", "milestone-quarter", "milestone-half"]);
  });

  it("returns the next unearned milestone for partial progress", () => {
    expect(getNextMilestone(0)?.id).toBe("milestone-quarter");
    expect(getNextMilestone(50)?.id).toBe("milestone-three-quarter");
    expect(getNextMilestone(99)?.id).toBe("milestone-complete");
    expect(getNextMilestone(100)).toBeNull();
  });

  it("summarizes milestone progress for UI display", () => {
    const summary = getMilestoneProgress(25);
    expect(summary.earnedCount).toBe(2);
    expect(summary.totalCount).toBe(5);
    expect(summary.isComplete).toBe(false);
    expect(summary.next?.id).toBe("milestone-half");
  });

  it("marks progress as complete at 100 percent", () => {
    const summary = getMilestoneProgress(100);
    expect(summary.isComplete).toBe(true);
    expect(summary.earnedCount).toBe(5);
    expect(summary.next).toBeNull();
  });
});
