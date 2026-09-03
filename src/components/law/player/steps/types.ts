import type { LawStep } from "../../../../types/law";

export interface StepProps {
  step: LawStep;
  accent: string;
  accentSoft: string;
  onDone: () => void;
}

/** 从对比句中尽量提取标题（"X与Y的异同"等） */
export function compareTitles(text: string): [string, string] {
  const match = text.match(/([^，。；\s]{2,8})(?:与|和|跟)([^，。；\s]{2,8})(?:异同|区别|比较|对比|相比)?/);
  if (match) return [match[1], match[2]];
  return ["甲", "乙"];
}

export function splitItems(text: string): string[] {
  const parts = text
    .split(/[①-⑨]|[；;]/)
    .map((part) => part.trim().replace(/^[、.，,。：:]*/, ""))
    .filter((part) => part.length >= 2);
  return parts.length >= 2 ? parts : [text];
}
