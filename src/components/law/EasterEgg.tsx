import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  markEggSeen,
  unlockEgg,
  wasEggSeen,
  type EggTrigger,
} from "../../lib/law-progress";

/** 学习区一律沉浸：隐藏摄影站导航，专注学习（各学习页面挂载时调用） */
export function useLawImmersive() {
  useEffect(() => {
    document.body.classList.add("law-immersive");
    return () => document.body.classList.remove("law-immersive");
  }, []);
}

const LETTER: ReactNode = (
  <>
    <p className="law-egg__greet">给一直很努力的那个女孩子：</p>
    <p className="law-egg__line">
      我知道你最近一直在哭。
      <br />
      背不完的书、写不完的题、追着你跑的时间，
      <br />
      像一座越来越高的山。
    </p>
    <p className="law-egg__line">
      可是我想偷偷告诉你——
      <br />
      <b>考不上，也没什么大不了的。</b>
    </p>
    <p className="law-egg__line">
      考试只是漫长人生里的一次体验，
      <br />
      它不会定义你是谁，
      <br />
      更不会比你现在闪闪发光的样子更重要。
    </p>
    <p className="law-egg__line">
      你已经在做一件很勇敢的事了：
      <br />
      为了一个目标，一天一天地坚持。
      <br />
      这样的你，已经很了不起。
    </p>
    <p className="law-egg__line">
      凌晨两点的眼泪，清晨七点的困意，
      <br />
      还有考完之后的每一个选择——
      <br />
      我都会陪着你。
    </p>
    <p className="law-egg__sign">
      —— 永远站在你这边的奶黄包 🐱
    </p>
    <p className="law-egg__love">💛 奶黄包非常非常非常爱你 💛</p>
  </>
);

const TRIGGERS: Record<EggTrigger, { emoji: string; title: string; desc: string }> = {
  midnight: { emoji: "🌙", title: "深夜的悄悄话", desc: "这么晚还在学呀……有一封信想给你" },
  firstLesson: { emoji: "🎀", title: "第一份小礼物", desc: "你完成了第一课！有个小东西想给你" },
  hundred: { emoji: "💌", title: "第 100 个知识点", desc: "你已经掌握了 100 个知识点，打开它" },
  symbol: { emoji: "🐱", title: "奶黄包的留言", desc: "小彩蛋已解锁" },
};

/** 学习中心页脚的小小奶黄包：点 3 下解锁隐藏留言 */
export function LawEggSymbol() {
  const [taps, setTaps] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  function tap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 3) {
      setUnlocked(unlockEgg("symbol"));
      setTaps(0);
    }
  }

  if (unlocked) return <EggModal trigger="symbol" />;
  return (
    <button
      type="button"
      className="law-egg-symbol"
      onClick={tap}
      aria-label="轻轻点一下"
      data-taps={taps}
    >
      🐱
    </button>
  );
}

/** 彩蛋触发逻辑：深夜 / 首次掌握 / 100 课（挂在学习相关页面即可） */
export function useEggListener(doneCount: number): EggTrigger | null {
  const [trigger, setTrigger] = useState<EggTrigger | null>(null);

  useEffect(() => {
    if (trigger) return;
    const hour = new Date().getHours();
    const isNight = hour >= 23 || hour < 5;
    if (isNight) {
      if (unlockEgg("midnight")) setTrigger("midnight");
      return;
    }
    if (doneCount === 1 && unlockEgg("firstLesson")) {
      setTrigger("firstLesson");
      return;
    }
    if (doneCount >= 100 && unlockEgg("hundred")) {
      setTrigger("hundred");
      return;
    }
  }, [trigger, doneCount]);

  return trigger;
}

/** 一键挂载：监听彩蛋触发 + 渲染信纸弹窗 */
export function LawEggListener({ doneCount }: { doneCount?: number }) {
  const [egg, setEgg] = useState<EggTrigger | null>(null);
  const [total, setTotal] = useState(doneCount ?? 0);

  useEffect(() => {
    // 无传入时自行统计掌握数
    if (doneCount !== undefined) {
      setTotal(doneCount);
      return;
    }
    // 从 localStorage 汇总
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

  const trigger = useEggListener(total);

  useEffect(() => {
    if (trigger) setEgg(trigger);
  }, [trigger]);

  return egg ? <EggModal trigger={egg} onClose={() => setEgg(null)} /> : null;
}

export function EggModal({ trigger, onClose }: { trigger: EggTrigger; onClose?: () => void }) {
  const meta = TRIGGERS[trigger];
  const [seen, setSeen] = useState(() => wasEggSeen(trigger));

  useEffect(() => {
    if (!seen) {
      markEggSeen(trigger);
      setSeen(true);
    }
  }, [seen, trigger]);

  return (
    <div className="law-egg-overlay" role="dialog" aria-modal="true" aria-label={meta.title}>
      <motion.div
        className="law-egg-card"
        initial={{ opacity: 0, y: 46, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 18 }}
      >
        <div className="law-egg-card__emoji" aria-hidden="true">
          {meta.emoji}
          <span className="law-egg-card__heart">💛</span>
        </div>
        <h3>{meta.title}</h3>
        <div className="law-egg-card__letter">{LETTER}</div>
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
        <p className="law-egg-card__hint">（想再看一遍？去学习中心页脚点那只小猫 3 下）</p>
      </motion.div>
    </div>
  );
}

export function EggDock() {
  return (
    <AnimatePresence>
      <div className="law-egg-dock" aria-hidden="true" />
    </AnimatePresence>
  );
}
