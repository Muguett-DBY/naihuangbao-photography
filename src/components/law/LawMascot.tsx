import { motion } from "framer-motion";

export type LawMood = "idle" | "think" | "happy" | "cheer" | "oops";

/** 学习小助手吉祥物：奶黄包脸（纯 SVG，随心情变换表情） */
export function LawMascot({ mood = "idle", size = 64 }: { mood?: LawMood; size?: number }) {
  return (
    <motion.div
      className={`law-mascot is-${mood}`}
      style={{ width: size, height: size }}
      animate={{ y: [0, -3, 0] }}
      transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* 耳朵 */}
        <ellipse cx="24" cy="26" rx="10" ry="14" fill="#f2c9a0" transform="rotate(-18 24 26)" />
        <ellipse cx="76" cy="26" rx="10" ry="14" fill="#f2c9a0" transform="rotate(18 76 26)" />
        {/* 脸 */}
        <ellipse cx="50" cy="56" rx="42" ry="38" fill="#ffdfb3" />
        <ellipse cx="50" cy="70" rx="20" ry="12" fill="#ffe9cb" />
        {mood === "happy" || mood === "cheer" ? (
          <motion.g
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            <ellipse cx="50" cy="17.5" rx="3.6" ry="4.5" fill="#ffb85c" />
          </motion.g>
        ) : null}
        {mood === "cheer" ? (
          <>
            <circle cx="14" cy="34" r="4" fill="#ffd27f" />
            <circle cx="86" cy="34" r="4" fill="#ffd27f" />
            <circle cx="8" cy="58" r="3" fill="#ffb85c" />
            <circle cx="92" cy="58" r="3" fill="#ffb85c" />
          </>
        ) : null}
        {/* 眼睛 */}
        {mood === "cheer" || mood === "happy" ? (
          <motion.g
            animate={{ scaleY: [1, 0.35, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, times: [0, 0.5, 1] }}
            style={{ transformOrigin: "50px 50px" }}
          >
            <path d="M30 46 q6 -8 12 0" stroke="#7a4b32" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M58 46 q6 -8 12 0" stroke="#7a4b32" strokeWidth="4" fill="none" strokeLinecap="round" />
          </motion.g>
        ) : (
          <>
            <circle cx="34" cy="46" r="5.2" fill="#5e3a28" />
            <circle cx="66" cy="46" r="5.2" fill="#5e3a28" />
            <circle cx="36" cy="44" r="1.8" fill="#fff" />
            <circle cx="68" cy="44" r="1.8" fill="#fff" />
          </>
        )}
        {/* 嘴 */}
        {mood === "oops" ? (
          <ellipse cx="50" cy="66" rx="9" ry="7" fill="#9c543c" />
        ) : (
          <path
            d="M38 62 q12 12 24 0"
            stroke="#8a4b34"
            strokeWidth="4.6"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* 腮红 */}
        <ellipse cx="22" cy="58" rx="7" ry="4.6" fill="#f6a98c" opacity="0.75" />
        <ellipse cx="78" cy="58" rx="7" ry="4.6" fill="#f6a98c" opacity="0.75" />
      </svg>
    </motion.div>
  );
}
