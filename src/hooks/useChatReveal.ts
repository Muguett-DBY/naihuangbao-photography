import { useCallback, useEffect, useRef } from "react";

const REVEAL_TICK_MS = 24;
const REVEAL_MAX_TICKS = 150;

type RevealState = { timer: number; target: string; shown: number; messageId: string; finished: boolean };
type RevealWriter = (messageId: string, content: string, done: boolean) => void;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** 逐字打字机揭示：流式内容边到边写，流读完后再让动画自然跑完并落定全文。 */
export function useChatReveal(write: RevealWriter) {
  const revealRef = useRef<RevealState>({ timer: 0, target: "", shown: 0, messageId: "", finished: false });

  useEffect(() => () => {
    if (revealRef.current.timer) window.clearInterval(revealRef.current.timer);
  }, []);

  const stopReveal = useCallback(() => {
    if (revealRef.current.timer) {
      window.clearInterval(revealRef.current.timer);
      revealRef.current.timer = 0;
    }
    revealRef.current.messageId = "";
  }, []);

  const startReveal = useCallback((messageId: string) => {
    const previous = revealRef.current;
    // 上一条还在逐字揭示时被打断：先落定全文，避免气泡停在半截
    if (previous.timer && previous.messageId && previous.messageId !== messageId) {
      window.clearInterval(previous.timer);
      write(previous.messageId, previous.target, true);
    }
    stopReveal();
    revealRef.current.target = "";
    revealRef.current.shown = 0;
    revealRef.current.finished = false;
    revealRef.current.messageId = messageId;
    if (prefersReducedMotion()) return;
    revealRef.current.timer = window.setInterval(() => {
      const state = revealRef.current;
      if (!state.messageId) return;
      if (state.shown >= state.target.length) {
        // 流已读完且动画跑完：落定全文并停表
        if (state.finished) {
          const { messageId: id, target } = state;
          window.clearInterval(state.timer);
          state.timer = 0;
          state.messageId = "";
          write(id, target, true);
        }
        return;
      }
      const step = Math.max(2, Math.ceil(state.target.length / REVEAL_MAX_TICKS));
      state.shown = Math.min(state.target.length, state.shown + step);
      write(state.messageId, state.target.slice(0, state.shown), false);
    }, REVEAL_TICK_MS);
  }, [stopReveal, write]);

  const pushReveal = useCallback((text: string) => {
    const state = revealRef.current;
    if (!state.messageId) return;
    state.target = text;
    if (!state.timer) {
      state.shown = text.length;
      write(state.messageId, text, false);
    }
  }, [write]);

  const finishReveal = useCallback((messageId: string, finalText: string) => {
    const state = revealRef.current;
    // 动画进行中：标记流已读完，让逐字揭示自然跑完（间隔会落定全文）
    if (state.messageId === messageId && state.timer && finalText.length > 0) {
      state.target = finalText;
      state.finished = true;
      return;
    }
    stopReveal();
    write(messageId, finalText, true);
  }, [stopReveal, write]);

  return { startReveal, pushReveal, finishReveal, stopReveal };
}
