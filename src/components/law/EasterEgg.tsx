import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { motion } from "framer-motion";
import {
  LAW_PROGRESS_EVENT,
  getGraduatedWrongCount,
  getLawProgress,
  getStreakDays,
  getUnlockedEggs,
  getWrongLessons,
  markEggSeen,
  unlockEgg,
  wasEggSeen,
  type EggTrigger,
} from "../../lib/law-progress";
import { getPlan } from "../../lib/law-plan";
import { checkEasterEggPure } from "../../lib/law-egg";
import { playLawSound } from "../../lib/law-sound";
import { LAW_SUBJECT_MAP } from "../../data/law/meta";
import { loadLawFlowStats } from "../../data/law/loader";
import { EGG_META, LETTERS } from "./eggContent";
import type { LawSubjectId } from "../../types/law";

/** 学习区一律沉浸：隐藏摄影站导航，专注学习（各学习页面挂载时调用） */
export function useLawImmersive() {
  useEffect(() => {
    document.body.classList.add("law-immersive");
    return () => document.body.classList.remove("law-immersive");
  }, []);
}

/** 从当前 URL 推断学科：/law/{subject}、/law/learn/{id}、/law/graphic/{id} */
function subjectFromPath(pathname: string): LawSubjectId | null {
  const lessonMatch = /\/law\/(?:learn|graphic)\/([a-z]+)-q/.exec(pathname);
  const subjectMatch = /^\/law\/([a-z]+)\/?$/.exec(pathname);
  const id = (lessonMatch?.[1] ?? subjectMatch?.[1]) as LawSubjectId | undefined;
  return id && id in LAW_SUBJECT_MAP ? id : null;
}

/** 时间/里程碑型彩蛋判定（一次性）；判定逻辑在 lib/law-egg（纯函数，可测） */
function checkEasterEgg(
  doneCount: number,
  path?: { halfDone: boolean; allDone: boolean },
): EggTrigger | null {
  return checkEasterEggPure({
    now: new Date(),
    doneCount,
    streakDays: getStreakDays(),
    wrongLessons: getWrongLessons().length,
    daysLeft: getPlan().daysLeft,
    unlocked: getUnlockedEggs(),
    graduatedWrongCount: getGraduatedWrongCount(),
    pathHalfDone: path?.halfDone,
    bookAllDone: path?.allDone,
  });
}

/** 由图解首次看完触发的事件途径 */
export const EGG_EVENT = "nhb-law-egg";

/** 彩蛋触发逻辑（挂在学习相关页面即可） */
export function useEggListener(
  doneCount: number,
  path?: { halfDone: boolean; allDone: boolean },
): EggTrigger | null {
  const [trigger, setTrigger] = useState<EggTrigger | null>(null);

  useEffect(() => {
    if (trigger) return;
    const found = checkEasterEgg(doneCount, path);
    if (found) {
      // 触发即解锁：不锁的话时间型彩蛋（早安/深夜）在每次页面导航都会重新弹出，
      // 反复打断学习流。想重看可以打开学习中心页脚的彩蛋图鉴。
      if (unlockEgg(found)) playLawSound("egg");
      setTrigger(found);
    }
  }, [trigger, doneCount, path]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && unlockEgg("graphicFirst")) {
        playLawSound("egg");
        setTrigger("graphicFirst");
      }
    };
    document.addEventListener(EGG_EVENT, handler);
    return () => document.removeEventListener(EGG_EVENT, handler);
  }, []);

  return trigger;
}

/** 一键挂载：监听彩蛋触发 + 渲染信纸弹窗 */
export function LawEggListener({ doneCount }: { doneCount?: number }) {
  const [egg, setEgg] = useState<EggTrigger | null>(null);
  const [total, setTotal] = useState(doneCount ?? 0);
  const [path, setPath] = useState<{ halfDone: boolean; allDone: boolean } | undefined>(undefined);
  const location = useLocation();

  const refreshTotal = useCallback(() => {
    if (doneCount !== undefined) {
      setTotal(doneCount);
      return;
    }
    try {
      const raw = localStorage.getItem("nhb-law-academy-v1");
      if (raw) {
        const store = JSON.parse(raw) as { lessons?: Record<string, { completedAt?: number }> };
        setTotal(Object.values(store.lessons ?? {}).filter((l) => l.completedAt).length);
      }
    } catch {
      /* ignore */
    }
  }, [doneCount]);

  useEffect(() => {
    refreshTotal();
  }, [refreshTotal]);

  // 当前这本书的学习流进度（路径半程/全书通彩蛋的判定输入）：
  // 只读 meta（页面本来就会取），不打扰分块加载的传输预算
  useEffect(() => {
    const subject = subjectFromPath(location.pathname);
    if (!subject) {
      setPath(undefined);
      return;
    }
    let cancelled = false;
    loadLawFlowStats(subject, getLawProgress())
      .then(({ total: flowTotal, done }) => {
        if (!cancelled && flowTotal > 0) {
          setPath({ halfDone: done * 2 >= flowTotal, allDone: done >= flowTotal });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [location.pathname, total]);

  // 错题建档/毕业/课时完成的当场重查：彩蛋在学习的那一刻弹出，不等下次进页面
  useEffect(() => {
    const handler = () => refreshTotal();
    document.addEventListener(LAW_PROGRESS_EVENT, handler);
    return () => document.removeEventListener(LAW_PROGRESS_EVENT, handler);
  }, [refreshTotal]);

  const trigger = useEggListener(total, path);

  useEffect(() => {
    if (trigger) setEgg(trigger);
  }, [trigger]);

  return egg ? <EggModal trigger={egg} onClose={() => setEgg(null)} /> : null;
}

/** 学习中心页脚的小小奶黄包：点 3 下解锁/重看隐藏留言 */
export function LawEggSymbol() {
  const [taps, setTaps] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  function tap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 3) {
      // 已解锁过也要弹（隐藏留言随时可以重看）
      if (unlockEgg("symbol")) playLawSound("egg");
      setUnlocked(true);
      setTaps(0);
    }
  }

  if (unlocked) return <EggModal trigger="symbol" onClose={() => setUnlocked(false)} />;
  return (
    <button
      type="button"
      className="law-egg-symbol"
      onClick={tap}
      aria-label="奶黄包（听说点三下会有惊喜）"
      data-taps={taps}
    >
      🐱
    </button>
  );
}

export function EggModal({ trigger, onClose }: { trigger: EggTrigger; onClose?: () => void }) {
  const meta = EGG_META[trigger];
  const [seen, setSeen] = useState(() => wasEggSeen(trigger));

  useEffect(() => {
    if (!seen) {
      markEggSeen(trigger);
      setSeen(true);
    }
  }, [seen, trigger]);

  // Esc 关闭 + 点遮罩关闭：弹窗不能只能用鼠标关（可达性）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        markEggSeen(trigger);
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trigger, onClose]);

  return (
    <div
      className="law-egg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          markEggSeen(trigger);
          onClose?.();
        }
      }}
    >
      <motion.div
        className="law-egg-card"
        initial={{ opacity: 0, y: 46, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 18 }}
      >
        <button
          type="button"
          className="law-egg-card__x"
          aria-label="关闭"
          onClick={() => {
            markEggSeen(trigger);
            onClose?.();
          }}
        >
          ✕
        </button>
        <div className="law-egg-card__emoji" aria-hidden="true">
          {meta.emoji}
          <span className="law-egg-card__heart">💛</span>
        </div>
        <h3>{meta.title}</h3>
        <div className="law-egg-card__letter">{LETTERS[trigger] ?? null}</div>
        <div className="law-egg-card__footer">
          <button
            type="button"
            className="law-egg-card__close"
            onClick={() => {
              markEggSeen(trigger);
              onClose?.();
            }}
          >
            收好这封信 💌
          </button>
          <p className="law-egg-card__hint">（想再看一遍？学习中心页脚 → 彩蛋图鉴）</p>
        </div>
      </motion.div>
    </div>
  );
}
