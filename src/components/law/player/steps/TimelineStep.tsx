import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { StepShell } from "../Animated";
import type { StepProps } from "./types";

interface TimelineEvent {
  when: string;
  what: string;
}

function guessTimeline(text: string): TimelineEvent[] {
  // 从文本里抓取 "年代/朝代 → 事件" 模式
  const entries: TimelineEvent[] = [];
  const tokens = text.split(/；|;/);
  for (const token of tokens) {
    const match = token.match(/([0-9]{2,4}年?|[夏商周秦汉三国两晋南北朝隋唐五代宋元明清]+|[近现代]{0,2})(.{1,26})/);
    if (!match) continue;
    const when = match[1].trim();
    const what = match[2].trim();
    if (when && what && what !== when) entries.push({ when, what });
  }
  return entries.slice(0, 7);
}

/** 时间线型步骤：拖移游标沿时间轴走，点击节点展开事件；全部看过即完成 */
export function TimelineStep({ step, accent, accentSoft, onDone }: StepProps) {
  const events = useMemo(() => step.timeline ?? guessTimeline(step.text), [step]);
  const [visited, setVisited] = useState<boolean[]>(() => events.map(() => false));
  const [active, setActive] = useState(0);
  const doneRef = useRef(false);

  const visitedCount = visited.filter(Boolean).length;
  const done = events.length > 0 && visitedCount >= events.length;

  function markVisited(index: number) {
    setActive(index);
    setVisited((prev) => {
      const next = prev.map((value, i) => (i === index ? true : value));
      if (next.filter(Boolean).length >= events.length && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return next;
    });
  }

  // 拆不出时间线（<2 节点）：无交互可做，挂载即自动完成（否则下一步永久禁用）
  useEffect(() => {
    if (events.length < 2) onDone();
  }, [events.length, onDone]);

  if (events.length < 2) {
    return (
      <StepShell eyebrow="🕰️ 时间线型" title={step.text} done>
        <p className="law-note">本条内容请按顺序熟读；旁边的原文可以随时查阅。</p>
      </StepShell>
    );
  }

  return (
    <StepShell
      eyebrow="🕰️ 时间线型 · 顺着时间走"
      title={`时间轴 · ${events.length} 个节点`}
      hint={
        done
          ? undefined
          : `👆 点每个圆点看事件（${visitedCount}/${events.length}），顺一遍就记住了`
      }
      done={done}
      doneLabel="全线路走完，时间线装进脑袋 ✓"
    >
      <div
        className="law-timeline"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        <div className="law-timeline__track">
          <div className="law-timeline__line" />
          <motion.div
            className="law-timeline__progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: done ? 1 : (active + 1) / events.length }}
            style={{ transformOrigin: "left" }}
          />
          {events.map((event, index) => (
            <button
              key={`${index}-${event.when}`}
              type="button"
              className={`law-timeline__dot ${visited[index] ? "is-visited" : ""} ${active === index ? "is-active" : ""}`}
              onClick={() => markVisited(index)}
              aria-label={`${event.when}：${event.what}`}
            >
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="law-timeline__labels">
          {events.map((event, index) => (
            <span key={index} className="law-timeline__when">
              {event.when}
            </span>
          ))}
        </div>
        <motion.div
          key={active}
          className="law-timeline__card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <strong>{events[active].when}</strong>
          <p>{events[active].what}</p>
        </motion.div>
      </div>
    </StepShell>
  );
}
