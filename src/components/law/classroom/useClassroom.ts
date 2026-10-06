import { useEffect, useMemo, useState } from "react";
import { safeLocalStorage } from "../../../lib/browser-storage";
import { generateScript, sceneTypeOf } from "../../../lib/law-classroom";
import type { LawStep } from "../../../types/law";

/**
 * useClassroom — 课堂模式的核心 Hook。
 * 管理：课堂模式开关、当前步骤的老师讲课稿。
 * 持久化：nhb-law-classroom 存储用户偏好。
 */
export function useClassroom(currentStep: LawStep | undefined, initialOn = false) {
  // 课堂模式（场景化视频课堂）为 opt-in：首次使用默认关闭，🎓 切换后记住偏好。
  // 直达课堂入口（学习中心「开始学习」?classroom=1）越过持久偏好直接开课堂。
  const [classroomMode, setClassroomMode] = useState(
    () => initialOn || safeLocalStorage.getItem("nhb-law-classroom") === "on"
  );

  // 直达课堂 = 用户主动选择开课堂：落盘记住，翻到下一课仍延续课堂模式
  useEffect(() => {
    if (initialOn) safeLocalStorage.setItem("nhb-law-classroom", "on");
  }, [initialOn]);

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
