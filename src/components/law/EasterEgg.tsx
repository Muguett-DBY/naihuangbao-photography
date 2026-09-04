import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  getWrongLessons,
  markEggSeen,
  unlockEgg,
  wasEggSeen,
  type EggTrigger,
} from "../../lib/law-progress";
import { getStreakDays } from "../../lib/law-progress";
import { getPlan } from "../../lib/law-plan";

/** 学习区一律沉浸：隐藏摄影站导航，专注学习（各学习页面挂载时调用） */
export function useLawImmersive() {
  useEffect(() => {
    document.body.classList.add("law-immersive");
    return () => document.body.classList.remove("law-immersive");
  }, []);
}

/** 完整大信：给那个一直努力的女孩子 */
const LETTER_MAIN: ReactNode = (
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
    <p className="law-egg__sign">—— 永远站在你这边的奶黄包 🐱</p>
    <p className="law-egg__love">💛 奶黄包非常非常非常爱你 💛</p>
  </>
);

/** 深夜信 */
const LETTER_MIDNIGHT: ReactNode = (
  <>
    <p className="law-egg__greet">这么晚还没睡呀：</p>
    <p className="law-egg__line">
      月亮都困了，你怎么还在学？
      <br />
      不是催你，是想告诉你——
      <br />
      <b>你努力的样子，比月光还亮。</b>
    </p>
    <p className="law-egg__line">
      如果今天背不下去了，就去睡吧。
      <br />
      书明天还在，我会一直陪你。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（熬夜也要记得喝水）</p>
    <p className="law-egg__love">💛 晚安，好梦 💛</p>
  </>
);

/** 清晨信 */
const LETTER_MORNING: ReactNode = (
  <>
    <p className="law-egg__greet">早呀，小姑娘：</p>
    <p className="law-egg__line">
      六点的风、七点的光，
      <br />
      都看到了你比闹钟更早的坚持。
      <br />
      今天也要元气满满哦！
    </p>
    <p className="law-egg__line">昨晚背的内容，今天会变成你的底气。</p>
    <p className="law-egg__sign">—— 奶黄包 🐱（早餐要吃饱！）</p>
    <p className="law-egg__love">☀️ 新的一天，也在一起努力 💛</p>
  </>
);

/** 连续三天 */
const LETTER_STREAK: ReactNode = (
  <>
    <p className="law-egg__greet">连续三天啦！</p>
    <p className="law-egg__line">
      有一个小秘密：
      <br />
      人类最了不起的能力不是聪明，
      <br />
      而是<b>坚持了三天还不肯停下</b>。
    </p>
    <p className="law-egg__line">
      三天前的你，给今天的你铺好了路。
      <br />
      三天后的你，正在等你。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（继续！）</p>
    <p className="law-egg__love">🔥 连续学习 · 第 3 天 💛</p>
  </>
);

/** 错题本 3 道 */
const LETTER_WRONG: ReactNode = (
  <>
    <p className="law-egg__greet">看到你的错题本啦：</p>
    <p className="law-egg__line">
      错题不是耻辱，
      <br />
      是地图上被标出来的坑——
      <br />
      <b>标记过的坑，考试时你就绕得开。</b>
    </p>
    <p className="law-egg__line">错的这三道，将来都是你得分的地方。</p>
    <p className="law-egg__sign">—— 奶黄包 🐱</p>
    <p className="law-egg__love">🩹 跟错误做朋友，它也会回报你 💛</p>
  </>
);

/** 第一次看图解 */
const LETTER_GRAPHIC: ReactNode = (
  <>
    <p className="law-egg__greet">你打开了第一张图解！</p>
    <p className="law-egg__line">
      先看懂再背，事半功倍——<br />
      你这么学，就是在给自己造"画面记忆"。
    </p>
    <p className="law-egg__line">记住这张图，以后闭上眼睛都能回忆起来。</p>
    <p className="law-egg__sign">—— 奶黄包 🐱（画图的人很用心哦）</p>
    <p className="law-egg__love">📐 视觉记忆 · 百倍效率 💛</p>
  </>
);

/** 考前 30 天 */
const LETTER_EXAM30: ReactNode = (
  <>
    <p className="law-egg__greet">冲刺 30 天：</p>
    <p className="law-egg__line">
      最后一个月，你不需要更多知识，
      <br />
      只需要<b>照顾好自己</b>，
      <br />
      和每天一点点稳稳地往前走。
    </p>
    <p className="law-egg__line">
      三十天前的你开始准备了，
      <br />
      三十天后的你，一定感谢现在的自己。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（稳住，我们能赢）</p>
    <p className="law-egg__love">⏳ 最后 30 天 · 一起走完 💛</p>
  </>
);

/** 平安夜信（考前夜） */
const LETTER_CHRISTMAS: ReactNode = (
  <>
    <p className="law-egg__greet">平安夜快乐：</p>
    <p className="law-egg__line">
      明天就要上考场了。
      <br />
      别怕——<b>你比想象中的自己，准备得更充分。</b>
    </p>
    <p className="law-egg__line">
      就算明天有不会的题，
      <br />
      也只是人生试卷上的一小格，
      <br />
      不是你的全部。
    </p>
    <p className="law-egg__line">
      深呼吸，睡个好觉，
      <br />
      我会在心里陪着你。
    </p>
    <p className="law-egg__sign">—— 平安夜的奶黄包 🎄</p>
    <p className="law-egg__love">💛 你值得被温柔以待 💛</p>
  </>
);

const LETTERS: Record<EggTrigger, ReactNode> = {
  midnight: LETTER_MIDNIGHT,
  morning: LETTER_MORNING,
  firstLesson: LETTER_MAIN,
  hundred: LETTER_MAIN,
  streak3: LETTER_STREAK,
  wrongbook3: LETTER_WRONG,
  graphicFirst: LETTER_GRAPHIC,
  exam30: LETTER_EXAM30,
  christmas: LETTER_CHRISTMAS,
  symbol: LETTER_MAIN,
};

const TRIGGERS: Record<EggTrigger, { emoji: string; title: string }> = {
  firstLesson: { emoji: "🎀", title: "第一份小礼物" },
  hundred: { emoji: "💌", title: "第 100 个知识点" },
  midnight: { emoji: "🌙", title: "深夜的悄悄话" },
  morning: { emoji: "🌅", title: "早起的奖励" },
  streak3: { emoji: "🔥", title: "三天之约" },
  wrongbook3: { emoji: "🩹", title: "跟错误做朋友" },
  graphicFirst: { emoji: "📐", title: "第一张图解" },
  exam30: { emoji: "⏳", title: "最后的 30 天" },
  christmas: { emoji: "🎄", title: "平安夜的信" },
  symbol: { emoji: "🐱", title: "奶黄包的留言" },
};

/** 学习中心页脚的小小奶黄包：点 3 下解锁/重看隐藏留言 */
export function LawEggSymbol() {
  const [taps, setTaps] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  function tap() {
    const next = taps + 1;
    setTaps(next);
    if (next >= 3) {
      // 已解锁过也要弹（页脚提示"想再看一遍？点那只小猫 3 下"）
      unlockEgg("symbol");
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
      aria-label="轻轻点一下"
      data-taps={taps}
    >
      🐱
    </button>
  );
}

/** 时间/里程碑型彩蛋判定（一次性） */
function checkEasterEgg(doneCount: number): EggTrigger | null {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // 日期型（按优先级）
  if (month === 12 && day === 25 && unlockEgg("christmas")) return "christmas";
  if ((hour >= 23 || hour < 5) && unlockEgg("midnight")) return "midnight";
  if (hour >= 5 && hour < 9 && unlockEgg("morning")) return "morning";
  if (getPlan().daysLeft <= 30 && unlockEgg("exam30")) return "exam30";
  // 里程碑型
  if (doneCount === 1 && unlockEgg("firstLesson")) return "firstLesson";
  if (doneCount >= 100 && unlockEgg("hundred")) return "hundred";
  if (getStreakDays() >= 3 && unlockEgg("streak3")) return "streak3";
  if (getWrongLessons().length >= 3 && unlockEgg("wrongbook3")) return "wrongbook3";
  return null;
}

/** 由图解首次看完触发的事件途径 */
export const EGG_EVENT = "nhb-law-egg";

/** 彩蛋触发逻辑（挂在学习相关页面即可） */
export function useEggListener(doneCount: number): EggTrigger | null {
  const [trigger, setTrigger] = useState<EggTrigger | null>(null);

  useEffect(() => {
    if (trigger) return;
    const found = checkEasterEgg(doneCount);
    if (found) setTrigger(found);
  }, [trigger, doneCount]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && unlockEgg("graphicFirst")) setTrigger("graphicFirst");
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

  useEffect(() => {
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
        <div className="law-egg-card__letter">{LETTERS[trigger] ?? LETTER_MAIN}</div>
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
          <p className="law-egg-card__hint">（想再看一遍？去学习中心页脚点那只小猫 3 下）</p>
        </div>
      </motion.div>
    </div>
  );
}
