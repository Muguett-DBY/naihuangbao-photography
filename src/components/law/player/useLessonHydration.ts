import { useCallback, useEffect, useRef, useState } from "react";
import type { LawLesson } from "../../../types/law";

/**
 * 课内分层（S6·T1 巨型课治理）的全文水合：
 * - 轻视图先行：lesson.steps 前 lightBoundary 步是全文，其后是占位元数据（text 置空）；
 * - 三个拉取时机：①推进到距占位步骤 2 步内（含续学落点已在占位区）②进入自测阶段
 *   （出题需要完整步面）③调用方打开原文对照面板时手动 ensureRest()；
 * - 水合是一次性幂等操作：并发只发一次请求，失败允许在下一时机重试。
 */
export function useLessonHydration(
  restLoader: (() => Promise<LawLesson>) | undefined,
  lightBoundary: number,
  stepIndex: number,
  phase: string,
): { hydrated: LawLesson | null; ensureRest: () => void } {
  const [hydrated, setHydrated] = useState<LawLesson | null>(null);
  const hydratedRef = useRef(false);

  const ensureRest = useCallback(() => {
    if (!restLoader || hydratedRef.current) return;
    hydratedRef.current = true;
    restLoader()
      .then((full) => setHydrated(full))
      .catch(() => {
        hydratedRef.current = false;
      });
  }, [restLoader]);

  // ① 交互推进接近占位步骤 → 提前拉全文，跨过边界时无感
  useEffect(() => {
    if (restLoader && stepIndex + 2 >= lightBoundary) ensureRest();
  }, [restLoader, stepIndex, lightBoundary, ensureRest]);

  // ② 复习模式直达自测：出题需要全文
  useEffect(() => {
    if (restLoader && phase === "quiz") ensureRest();
  }, [restLoader, phase, ensureRest]);

  return { hydrated, ensureRest };
}
