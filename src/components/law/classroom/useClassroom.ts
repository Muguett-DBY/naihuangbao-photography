import { useMemo, useState } from "react";
import { safeLocalStorage } from "../../../lib/browser-storage";
import { generateScript, sceneTypeOf } from "../../../lib/law-classroom";
import type { LawStep } from "../../../types/law";

/**
 * useClassroom — 课堂模式的核心 Hook。
 * 管理：课堂模式开关、当前步骤的老师讲课稿。
 * 持久化：nhb-law-classroom 存储用户偏好。
 */
export function useClassroom(currentStep: LawStep | undefined) {
  const [classroomMode, setClassroomMode] = useState(
    () => safeLocalStorage.getItem("nhb-law-classroom") !== "off"
  );

  const teacherScript = useMemo(() => {
    if (!classroomMode || !currentStep) return "";
    return generateScript(currentStep, sceneTypeOf(currentStep));
  }, [classroomMode, currentStep]);

  function toggleClassroom() {
    const next = !classroomMode;
    setClassroomMode(next);
    safeLocalStorage.setItem("nhb-law-classroom", next ? "on" : "off");
    return next;
  }

  return { classroomMode, teacherScript, toggleClassroom };
}
