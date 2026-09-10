import type { ReactNode } from "react";
import type { EggTrigger } from "../../lib/law-progress";

/**
 * 彩蛋内容层：信件全文 + 图鉴元数据（emoji/标题/预览/解锁暗示）。
 * 与触发逻辑（EasterEgg.tsx）解耦，图鉴（EggGallery.tsx）与弹窗共用同一份文案。
 */

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
const LETTER_STREAK3: ReactNode = (
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

/** 连续七天 */
const LETTER_STREAK7: ReactNode = (
  <>
    <p className="law-egg__greet">整整七天啦：</p>
    <p className="law-egg__line">
      一周之前，你还不知道自己能走多远；
      <br />
      现在，答案已经被你一天一天写了出来。
      <br />
      <b>坚持七天，是一件很了不起的事。</b>
    </p>
    <p className="law-egg__line">
      习惯就是在第七天悄悄长出来的——
      <br />
      今天的你，已经和一周前不一样了。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（为你骄傲）</p>
    <p className="law-egg__love">🌟 连续学习 · 第 7 天 💛</p>
  </>
);

/** 错题本 3 节课 */
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
    <p className="law-egg__line">错的这几道，将来都是你得分的地方。</p>
    <p className="law-egg__sign">—— 奶黄包 🐱</p>
    <p className="law-egg__love">🩹 跟错误做朋友，它也会回报你 💛</p>
  </>
);

/** 错题毕业（五次复习全部通过） */
const LETTER_GRADUATE: ReactNode = (
  <>
    <p className="law-egg__greet">错题毕业啦：</p>
    <p className="law-egg__line">
      还记得那道让你栽过跟头的题吗？
      <br />
      1 天、2 天、4 天、7 天、15 天——
      <br />
      你一次次回来，把它彻底征服了。
    </p>
    <p className="law-egg__line">
      <b>能把错误养成分数的人，考场最不怕意外。</b>
      <br />
      这个位置空出来啦，会有新的错题住进来，
      <br />
      也会像它一样，被你亲手送走。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（鼓掌！）</p>
    <p className="law-egg__love">🎓 错题本 · 首次毕业 💛</p>
  </>
);

/** 某本书路径过半 */
const LETTER_PATH_HALF: ReactNode = (
  <>
    <p className="law-egg__greet">这本书，你走到一半啦：</p>
    <p className="law-egg__line">
      翻过的每一页都算数——
      <br />
      前一半的你负责出发，
      <br />
      后一半的你，只需负责到达。
    </p>
    <p className="law-egg__line">
      <b>最难的从来不是还剩多少，是走到这里还没停下。</b>
      <br />
      而你已经做到了。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（继续加油）</p>
    <p className="law-egg__love">🧭 学习路径 · 过半 💛</p>
  </>
);

/** 某本书全部学完 */
const LETTER_BOOK_DONE: ReactNode = (
  <>
    <p className="law-egg__greet">一本书，被你完整学完啦：</p>
    <p className="law-egg__line">
      从第一页的陌生，到最后一页的熟悉，
      <br />
      这本书里的每一个考点，
      <br />
      都被你一节课一节课走完了。
    </p>
    <p className="law-egg__line">
      <b>合上它的时候，它已经长在你身上了。</b>
      <br />
      剩下的书不用急——
      <br />
      你已经证明过自己能走完一整本。
    </p>
    <p className="law-egg__sign">—— 奶黄包 🐱（超级骄傲！）</p>
    <p className="law-egg__love">🏆 全书通关 · 完整走完 💛</p>
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

/** 圣诞信（考前夜） */
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

const LETTER_FULL_SCORE: ReactNode = (
  <>
    <p className="law-egg__greet">给刚刚拿了满分的女孩子：</p>
    <p className="law-egg__line">
      四道题，全对。
      <br />
      不是运气，是你真的记住了。
    </p>
    <p className="law-egg__line">
      你看，那些觉得"背不住"的条文，
      <br />
      在你脑子里已经开始生根发芽了。
    </p>
    <p className="law-egg__line">
      保持这个节奏，
      <br />
      下一次满分会来得更快。
    </p>
    <p className="law-egg__sign">—— 为你骄傲的奶黄包 🐱</p>
  </>
);

const LETTER_NOTES_FIRST: ReactNode = (
  <>
    <p className="law-egg__greet">给第一个动笔的女孩子：</p>
    <p className="law-egg__line">
      背十遍不如写一遍。
      <br />
      你刚刚写下的那几行字，
      <br />
      比任何厚厚的讲义都珍贵。
    </p>
    <p className="law-egg__line">
      因为那是你自己消化之后的理解，
      <br />
      不是别人告诉你的答案。
    </p>
    <p className="law-egg__sign">—— 觉得你很棒的奶黄包 🐱</p>
  </>
);

const LETTER_MOCK_EXAM: ReactNode = (
  <>
    <p className="law-egg__greet">给第一次走进模拟考场的女孩子：</p>
    <p className="law-egg__line">
      计时、压力、不确定的题目——
      <br />
      你刚刚经历的就是考场的缩影。
    </p>
    <p className="law-egg__line">
      不管分数是多少，
      <br />
      敢开始模拟的人已经赢了一半。
    </p>
    <p className="law-egg__line">
      因为考场上最可怕的从来不是不会，
      <br />
      而是没有提前习惯"会紧张"的自己。
    </p>
    <p className="law-egg__sign">—— 一直在陪你的奶黄包 🐱</p>
  </>
);

export const LETTERS: Record<EggTrigger, ReactNode> = {
  midnight: LETTER_MIDNIGHT,
  morning: LETTER_MORNING,
  firstLesson: LETTER_MAIN,
  hundred: LETTER_MAIN,
  streak3: LETTER_STREAK3,
  streak7: LETTER_STREAK7,
  wrongbook3: LETTER_WRONG,
  wrongGraduate: LETTER_GRADUATE,
  pathHalf: LETTER_PATH_HALF,
  bookDone: LETTER_BOOK_DONE,
  graphicFirst: LETTER_GRAPHIC,
  exam30: LETTER_EXAM30,
  christmas: LETTER_CHRISTMAS,
  symbol: LETTER_MAIN,
  fullScore: LETTER_FULL_SCORE,
  notesFirst: LETTER_NOTES_FIRST,
  mockExamFirst: LETTER_MOCK_EXAM,
};

export interface EggMeta {
  emoji: string;
  title: string;
  /** 已解锁：图鉴卡片上的信件预览一句 */
  preview: string;
  /** 未解锁：模糊的解锁暗示 */
  hint: string;
}

export const EGG_META: Record<EggTrigger, EggMeta> = {
  firstLesson: { emoji: "🎀", title: "第一份小礼物", preview: "考不上，也没什么大不了的。", hint: "完成你的第一节课" },
  hundred: { emoji: "💌", title: "第 100 个知识点", preview: "这样的你，已经很了不起。", hint: "累计掌握 100 个知识点" },
  streak3: { emoji: "🔥", title: "三天之约", preview: "坚持了三天还不肯停下。", hint: "连续三天完成课时" },
  streak7: { emoji: "🌟", title: "七日之约", preview: "坚持七天，是一件很了不起的事。", hint: "连续七天完成课时" },
  wrongbook3: { emoji: "🩹", title: "跟错误做朋友", preview: "标记过的坑，考试时你就绕得开。", hint: "错题本里攒下 3 节课" },
  wrongGraduate: { emoji: "🎓", title: "错题毕业礼", preview: "能把错误养成分数的人，考场最不怕意外。", hint: "陪一道错题走完全部 5 次复习" },
  pathHalf: { emoji: "🧭", title: "半程之约", preview: "最难的，是走到这里还没停下。", hint: "任意一本书的学习路径走过一半" },
  bookDone: { emoji: "🏆", title: "全书通关", preview: "合上它的时候，它已经长在你身上了。", hint: "把一整本书全部学完" },
  graphicFirst: { emoji: "📐", title: "第一张图解", preview: "先看懂再背，事半功倍。", hint: "打开第一节图解课" },
  exam30: { emoji: "⏳", title: "最后的 30 天", preview: "三十天后的你，一定感谢现在的自己。", hint: "距考试只剩 30 天时来看我" },
  midnight: { emoji: "🌙", title: "深夜的悄悄话", preview: "你努力的样子，比月光还亮。", hint: "深夜 23 点到凌晨 5 点间来学习" },
  morning: { emoji: "🌅", title: "早起的奖励", preview: "昨晚背的内容，今天会变成你的底气。", hint: "清晨 5 点到 9 点间来学习" },
  christmas: { emoji: "🎄", title: "平安夜的信", preview: "你比想象中的自己，准备得更充分。", hint: "12 月 25 日，来收一封信" },
  symbol: { emoji: "🐱", title: "奶黄包的留言", preview: "奶黄包非常非常非常爱你。", hint: "学习中心页脚，点那只小猫三下" },
  fullScore: { emoji: "💯", title: "满分时刻", preview: "四道题全对的那一刻，你比想象中厉害。", hint: "首次自测全对" },
  notesFirst: { emoji: "✏️", title: "第一条笔记", preview: "写下来的，比背过的更牢。", hint: "写下你的第一条学习笔记" },
  mockExamFirst: { emoji: "📋", title: "模考初体验", preview: "模拟一万次，只为考场那一遍。", hint: "完成第一次模拟考试" },
};

/** 图鉴展示顺序：里程碑 → 时间型 → 隐藏款 */
export const EGG_ORDER: EggTrigger[] = [
  "firstLesson",
  "hundred",
  "streak3",
  "streak7",
  "wrongbook3",
  "wrongGraduate",
  "pathHalf",
  "bookDone",
  "graphicFirst",
  "exam30",
  "midnight",
  "morning",
  "christmas",
  "symbol",
  "fullScore",
  "notesFirst",
  "mockExamFirst",
];
