import { safeLocalStorage } from "./browser-storage";

/**
 * 学习正反馈音效（Web Audio API 合成，零外部音频文件）：
 * - 答对 = 上行双音；答错 = 低频短促；步骤完成 = 清脆单击；彩蛋解锁 = 三音琶音。
 * - 默认开启；prefers-reduced-motion 用户默认静音（可手动再开）。
 * - AudioContext 在首次播放（用户手势内）才创建， autoplay 策略下不会报警告。
 */

export type LawSoundName = "correct" | "wrong" | "step" | "egg";

const SOUND_KEY = "nhb-law-sound";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function isLawSoundEnabled(): boolean {
  const raw = safeLocalStorage.getItem(SOUND_KEY);
  if (raw === "on") return true;
  if (raw === "off") return false;
  return !prefersReducedMotion();
}

export function setLawSoundEnabled(on: boolean): void {
  safeLocalStorage.setItem(SOUND_KEY, on ? "on" : "off");
}

interface ToneSpec {
  /** 频率 Hz */
  f: number;
  /** 相对开始时间（秒） */
  t: number;
  /** 时长（秒） */
  d: number;
  type: OscillatorType;
  /** 峰值增益（音量，保持轻柔不刺耳） */
  g: number;
  /** 结束频率（向下滑音用） */
  slideTo?: number;
}

/** 四种音效的"谱子"：全部短促轻柔（峰值增益 ≤0.09，总时长 ≤0.34s） */
const TONES: Record<LawSoundName, readonly ToneSpec[]> = {
  // 答对：D5 → A5 上行双音（大五度，明快）
  correct: [
    { f: 587.33, t: 0, d: 0.1, type: "sine", g: 0.07 },
    { f: 880, t: 0.09, d: 0.14, type: "sine", g: 0.08 },
  ],
  // 答错：G3 短促低音，轻微下滑（"没关系"而不是"批评"）
  wrong: [{ f: 196, t: 0, d: 0.16, type: "triangle", g: 0.07, slideTo: 147 }],
  // 步骤完成：C6 极短轻点
  step: [{ f: 1046.5, t: 0, d: 0.05, type: "triangle", g: 0.045 }],
  // 彩蛋解锁：C5-E5-G5 三音琶音
  egg: [
    { f: 523.25, t: 0, d: 0.12, type: "sine", g: 0.07 },
    { f: 659.25, t: 0.09, d: 0.12, type: "sine", g: 0.07 },
    { f: 783.99, t: 0.18, d: 0.16, type: "sine", g: 0.08 },
  ],
};

/** 可注入的最小 AudioContext 形状（单测用 mock 实现，不需要真浏览器） */
export interface AudioContextLike {
  currentTime: number;
  state?: string;
  resume?(): Promise<unknown>;
  createOscillator(): {
    type: OscillatorType;
    frequency: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(node: unknown): { connect(node: unknown): unknown };
    start(t: number): void;
    stop(t: number): void;
  };
  createGain(): {
    gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(node: unknown): unknown;
  };
  destination: unknown;
}

export function createLawSounds(
  getContext: () => AudioContextLike | null,
  isEnabled: () => boolean = isLawSoundEnabled,
) {
  return {
    /** 播放一枚音效；静音或环境不支持时静默返回 false */
    play(name: LawSoundName): boolean {
      if (!isEnabled()) return false;
      const ctx = getContext();
      if (!ctx) return false;
      try {
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          void ctx.resume();
        }
      } catch {
        /* resume 失败也继续排程：多数浏览器在手势内会自动放行 */
      }
      const base = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9, base);
      master.connect(ctx.destination);
      for (const spec of TONES[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = base + spec.t;
        osc.type = spec.type;
        osc.frequency.setValueAtTime(spec.f, start);
        if (spec.slideTo !== undefined) {
          osc.frequency.exponentialRampToValueAtTime(spec.slideTo, start + spec.d);
        }
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(spec.g, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.d);
        osc.connect(gain).connect(master);
        osc.start(start);
        osc.stop(start + spec.d + 0.02);
      }
      return true;
    },
  };
}

let singleton: ReturnType<typeof createLawSounds> | null = null;

function defaultContext(): AudioContextLike | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return null;
  try {
    return new ctor() as AudioContextLike;
  } catch {
    return null;
  }
}

/** 应用内统一入口（模块级单例：AudioContext 只建一次） */
export function lawSounds(): ReturnType<typeof createLawSounds> {
  if (!singleton) singleton = createLawSounds(defaultContext);
  return singleton;
}

/** 便捷封装：各触发点一行接入 */
export function playLawSound(name: LawSoundName): boolean {
  return lawSounds().play(name);
}
