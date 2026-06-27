/**
 * Course progress milestones and badges.
 * Awards badges at specific progress thresholds.
 */

export type Milestone = {
  id: string;
  threshold: number;
  label: string;
  description: string;
  icon: string;
  color: string;
};

export const COURSE_MILESTONES: Milestone[] = [
  {
    id: "milestone-start",
    threshold: 0,
    label: "Started",
    description: "You've begun your learning journey!",
    icon: "Sprout",
    color: "#7AA675",
  },
  {
    id: "milestone-quarter",
    threshold: 25,
    label: "Quarter way",
    description: "25% complete — keep the momentum going!",
    icon: "TrendingUp",
    color: "#5a8a5a",
  },
  {
    id: "milestone-half",
    threshold: 50,
    label: "Halfway there",
    description: "50% complete — you're making great progress!",
    icon: "Target",
    color: "#d4881f",
  },
  {
    id: "milestone-three-quarter",
    threshold: 75,
    label: "Almost done",
    description: "75% complete — the finish line is in sight!",
    icon: "Award",
    color: "#c44d20",
  },
  {
    id: "milestone-complete",
    threshold: 100,
    label: "Completed",
    description: "100% complete — congratulations on finishing the course!",
    icon: "Trophy",
    color: "#b8860b",
  },
];

export function getEarnedMilestones(progressPercent: number): Milestone[] {
  return COURSE_MILESTONES.filter((m) => progressPercent >= m.threshold);
}

export function getNextMilestone(progressPercent: number): Milestone | null {
  return COURSE_MILESTONES.find((m) => progressPercent < m.threshold) ?? null;
}

export function getMilestoneProgress(progressPercent: number): {
  earned: Milestone[];
  next: Milestone | null;
  earnedCount: number;
  totalCount: number;
  isComplete: boolean;
} {
  const earned = getEarnedMilestones(progressPercent);
  const next = getNextMilestone(progressPercent);
  return {
    earned,
    next,
    earnedCount: earned.length,
    totalCount: COURSE_MILESTONES.length,
    isComplete: progressPercent >= 100,
  };
}
