import { useEffect, useState } from "react";
import { LAW_EGG_UNLOCKED_EVENT, getEggState, type EggTrigger } from "../../lib/law-progress";
import { isLawSoundEnabled, setLawSoundEnabled } from "../../lib/law-sound";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { EggModal } from "./EasterEgg";
import { EGG_META, EGG_ORDER } from "./eggContent";
import { acquireEscapeLayer, isTopEscapeLayer, releaseEscapeLayer } from "../../lib/esc-stack";

/** 解锁时间展示（旧数据可能没有 unlockedAt，退回首次查看时间） */
function formatUnlockDate(trigger: EggTrigger): string | null {
  const state = getEggState();
  const stamp = state.unlockedAt[trigger] ?? state.seenAt[trigger];
  if (!stamp) return null;
  const date = new Date(stamp);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/**
 * 彩蛋图鉴收集册：全部彩蛋的网格（已解锁=彩色+解锁时间+信件预览，可点开重读；
 * 未解锁=剪影+解锁暗示）。入口在学习中心页脚（LawEggGalleryButton）。
 */
export function EggGallery({ onClose }: { onClose: () => void }) {
  const [replay, setReplay] = useState<EggTrigger | null>(null);
  // 图鉴打开期间新解锁的彩蛋也要实时出现在网格（订阅解锁事件重读状态）
  const [state, setState] = useState(() => getEggState());
  const unlockedCount = EGG_ORDER.filter((trigger) => state.unlocked[trigger]).length;
  // 焦点圈禁：Tab 循环在图鉴内、打开时焦点入图鉴、关闭时归还页脚入口按钮。
  // 重读信时图鉴 DOM 暂时让位给信纸弹层，trap 随之停用，信关回来时重新吸入焦点
  const overlayRef = useFocusTrap<HTMLDivElement>({ active: !replay });

  useEffect(() => {
    const refresh = () => setState(getEggState());
    document.addEventListener(LAW_EGG_UNLOCKED_EVENT, refresh);
    return () => document.removeEventListener(LAW_EGG_UNLOCKED_EVENT, refresh);
  }, []);

  useEffect(() => {
    const layer = acquireEscapeLayer();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !replay && isTopEscapeLayer(layer)) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      releaseEscapeLayer(layer);
    };
  }, [onClose, replay]);

  if (replay) {
    return <EggModal trigger={replay} onClose={() => setReplay(null)} />;
  }

  return (
    <div
      ref={overlayRef}
      className="law-gallery-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="彩蛋图鉴"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="law-gallery">
        <button type="button" className="law-egg-card__x law-gallery__x" aria-label="关闭图鉴" onClick={onClose}>
          ✕
        </button>
        <header className="law-gallery__head">
          <h3>🥚 彩蛋图鉴</h3>
          <p>
            已收集 <b>{unlockedCount}</b> / {EGG_ORDER.length} 枚 —— 每一枚都是你走过的路
          </p>
        </header>
        <div className="law-gallery__grid">
          {EGG_ORDER.map((trigger) => {
            const meta = EGG_META[trigger];
            const unlocked = state.unlocked[trigger] === true;
            const date = unlocked ? formatUnlockDate(trigger) : null;
            // 锁定卡不可交互：裸 div 上的 aria-label 会被读屏忽略，role=group 使标注生效
            return unlocked ? (
              <button
                key={trigger}
                type="button"
                className="law-gallery__egg is-unlocked"
                onClick={() => setReplay(trigger)}
                aria-label={`${meta.title}（点开重读这封信）`}
              >
                <span className="law-gallery__egg-emoji" aria-hidden="true">
                  {meta.emoji}
                </span>
                <b>{meta.title}</b>
                <span className="law-gallery__egg-preview">{meta.preview}</span>
                <small>{date ? `${date} 解锁` : "已解锁"}</small>
              </button>
            ) : (
              <div key={trigger} role="group" className="law-gallery__egg is-locked" aria-label={`未解锁：${meta.title}`}>
                <span className="law-gallery__egg-emoji" aria-hidden="true">
                  {meta.emoji}
                </span>
                <b>？？？</b>
                <span className="law-gallery__egg-preview">{meta.hint}</span>
                <small>待解锁</small>
              </div>
            );
          })}
        </div>
        <p className="law-gallery__foot-note">
          未解锁的小心事会悄悄给出暗示，学习路上的每个时刻都值得被记住 💛
        </p>
      </div>
    </div>
  );
}

/** 学习中心页脚入口：彩蛋图鉴按钮（带已收集数） */
export function LawEggGalleryButton() {
  const [open, setOpen] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      const state = getEggState();
      setUnlockedCount(EGG_ORDER.filter((trigger) => state.unlocked[trigger]).length);
    };
    // 弹层关闭后同步一次；页面停留期间有新彩蛋解锁（如时段信当场弹出）也要即时更新计数
    if (!open) refresh();
    document.addEventListener(LAW_EGG_UNLOCKED_EVENT, refresh);
    return () => document.removeEventListener(LAW_EGG_UNLOCKED_EVENT, refresh);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="law-gallery-entry"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        🥚 彩蛋图鉴{unlockedCount !== null ? ` ${unlockedCount}/${EGG_ORDER.length}` : ""}
      </button>
      {open ? <EggGallery onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** 学习中心页脚：学习音效开关（默认开；reduce-motion 用户默认静音） */
export function LawSoundToggle() {
  const [enabled, setEnabled] = useState(isLawSoundEnabled);

  return (
    <button
      type="button"
      className={`law-sound-toggle ${enabled ? "is-on" : ""}`}
      aria-pressed={enabled}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        setLawSoundEnabled(next);
      }}
      title={enabled ? "学习音效已开启（答对/完成的小反馈声）" : "学习音效已静音"}
    >
      {enabled ? "🔊 音效" : "🔇 音效"}
    </button>
  );
}
