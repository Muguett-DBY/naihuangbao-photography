import { useEffect, useRef, useState } from "react";
import type { LawStep } from "../../../types/law";
import { kindLabel } from "./lessonHelpers";

/**
 * StepNavPopover — 长课（>8 步）的段落导航浮层：触发按钮 + listbox 菜单。
 *
 * 键盘约定：上下键移动游标（highlight），回车跳转，Esc 关闭；
 * 打开时游标落在当前步并立即聚焦（方向键不必先 Tab 一次），
 * 关闭时焦点归还触发按钮（选项按钮随浮层卸载，焦点不能掉空）。
 * 从 LessonPlayer 抽出（架构 500 行预算），行为与抽出前逐字一致。
 */
export function StepNavPopover({
  steps,
  stepIndex,
  onJump,
}: {
  steps: LawStep[];
  /** 当前步下标（aria-selected 与初始游标） */
  stepIndex: number;
  /** 跳到指定步（父级负责方向感与 replayKey） */
  onJump: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  // 浮层的键盘游标（上下键选择，回车跳转）
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);

  // 打开时键盘游标落在当前步，焦点同步进浮层（方向键立即可用）
  useEffect(() => {
    if (!open) return;
    setHighlight(stepIndex);
    menuRef.current?.querySelector<HTMLElement>('[data-highlight="true"]')?.focus();
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const item = menuRef.current?.querySelector<HTMLElement>('[data-highlight="true"]');
    item?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  // 归还焦点仅在"曾开→关"且焦点即将掉空时（Esc/跳转后选项按钮随浮层卸载）；
  // 点击外部关闭时焦点已落到所点之处，不能再抢回触发钮
  useEffect(() => {
    if (!open && openedRef.current) {
      const active = document.activeElement;
      if (!active || active === document.body) btnRef.current?.focus();
    }
    openedRef.current = open;
  }, [open]);

  // 点击浮层外 / 焦点移出浮层即关闭：浮层是 fixed 面板（小屏全宽），漏点会一直遮挡内容
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;
    const onOutsidePointer = (event: MouseEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) setOpen(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!root.contains(event.relatedTarget as Node | null)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutsidePointer);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("mousedown", onOutsidePointer);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  return (
    <div className="law-player__navpop" ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className={`law-player__navpop-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        🧭 段落导航
      </button>
      {open ? (
        <div
          className="law-player__navpop-menu"
          ref={menuRef}
          role="listbox"
          aria-label="段落导航"
          tabIndex={-1}
          onKeyDown={(event) => {
            // 长课键盘导航：上下选择、回车跳转、Esc 关闭
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => {
                const next = event.key === "ArrowDown" ? Math.min(h + 1, steps.length - 1) : Math.max(h - 1, 0);
                return next;
              });
            } else if (event.key === "Enter") {
              event.preventDefault();
              onJump(highlight);
              setOpen(false);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              role="option"
              aria-selected={index === stepIndex}
              data-highlight={index === highlight || undefined}
              className={
                (index === stepIndex ? "is-current " : "") +
                (index === highlight ? "is-highlight" : "")
              }
              onMouseEnter={() => setHighlight(index)}
              onFocus={() => setHighlight(index)}
              onClick={() => {
                onJump(index);
                setOpen(false);
              }}
            >
              {String(index + 1).padStart(2, "0")} · {kindLabel(step.kind)} · {step.text ? step.text.slice(0, 18) : "全文加载中…"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
