/**
 * 焦点循环的纯决策逻辑（从 useFocusTrap 抽出，便于 node 环境单测锁语义）：
 * 弹窗内 Tab/Shift+Tab 循环圈禁；焦点落在圈外时双向拉回（模态语义下点击遮罩后
 * focus 回到 body，前向 Tab 原本会逃到弹窗底层页面）。返回应聚焦的元素；
 * null = 不干预，交给浏览器默认行为。
 */
export type FocusCycleTarget = {
  /** 应聚焦的元素 */
  next: HTMLElement;
  /** 是否需要 preventDefault（拦截浏览器默认 Tab 移动） */
  prevent: boolean;
};

export function pickTabTarget(options: {
  focusables: HTMLElement[];
  activeElement: Element | null;
  shiftKey: boolean;
  container: HTMLElement;
}): FocusCycleTarget | null {
  const { focusables, activeElement, shiftKey, container } = options;
  if (focusables.length === 0) {
    return { next: container, prevent: true };
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (shiftKey) {
    if (activeElement === first || !container.contains(activeElement)) {
      return { next: last, prevent: true };
    }
    return null;
  }
  if (activeElement === last || !container.contains(activeElement)) {
    return { next: first, prevent: true };
  }
  return null;
}
