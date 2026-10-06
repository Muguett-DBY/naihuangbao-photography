import { safeLocalStorage } from "./browser-storage";

/**
 * TTS 语音抽象层（双引擎，零外部依赖）：
 *
 * 引擎 1（优先）：浏览器 SpeechSynthesis API —— 零依赖、离线可用；
 *   自动挑选最佳中文声线（zh-CN 本地声线优先，已知高质量神经音色加权）。
 * 引擎 2（兜底）：节拍模拟 —— 环境不支持或用户关闭时，按中文语速估算
 *   朗读时长走定时器，保证 speak 的 onEnd 节奏依然成立（课堂流程不会
 *   卡在"等朗读结束"，也不会在无语音环境里重叠推进）。
 *
 * 接口：
 * - isSupported —— 环境是否支持语音合成（引擎 1）
 * - speak(text, { rate?, onEnd?, onError? }) —— 朗读一段文字，结束回调
 * - cancel() —— 立即停止（真实朗读与模拟计时一并作废）
 * - pause() / resume() —— 暂停 / 恢复（仅引擎 1 有真实暂停语义）
 * - setTtsEnabled(bool) / isTtsEnabled() —— 用户总开关，关闭即静默并停止
 *
 * 队列管理：任意时刻最多一段朗读 —— 新的 speak 自动取消旧的；被取消
 * 一方的 onEnd/onError 一律不再触发（代际号作废，回调永不串扰）。
 *
 * 开关状态持久化到 localStorage（key 风格同 law-sound），刷新后仍记住用户选择。
 */

const TTS_ENABLED_KEY = "nhb-law-tts";

/** 环境是否支持浏览器语音合成（引擎 1） */
export const isSupported: boolean = typeof window !== "undefined" && "speechSynthesis" in window;

let enabled = safeLocalStorage.getItem(TTS_ENABLED_KEY) !== "off";

/** 用户是否开启了语音 */
export function isTtsEnabled(): boolean {
  return enabled;
}

/** 用户总开关：关闭时立即停止当前朗读，并持久化选择 */
export function setTtsEnabled(v: boolean): void {
  enabled = v;
  safeLocalStorage.setItem(TTS_ENABLED_KEY, v ? "on" : "off");
  if (!v) cancel();
}

/* ---------------- 引擎 1：中文声线自动挑选 ---------------- */

/** 高质量神经音色关键词（Edge/Chrome/macOS 常见中文声线，命中即加权） */
const PREMIUM_HINTS = ["xiaoxiao", "xiaoyi", "yunxi", "yunyang", "yunjian", "yunxia", "tingting", "meijia"] as const;

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!isSupported) return [];
  const list = window.speechSynthesis.getVoices();
  if (list.length > 0) cachedVoices = list;
  return cachedVoices;
}

if (isSupported) {
  refreshVoices();
  // Chrome 首次 getVoices() 常返回空表，声线列表异步就绪后刷新缓存
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

/** 声线打分：越高越好；非中文返回 -1（不参与挑选） */
function voiceScore(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("zh")) return -1;
  let score = lang.startsWith("zh-cn") ? 40 : 20;
  if (v.localService) score += 10; // 本地声线：离线可用、零网络延迟
  const name = v.name.toLowerCase();
  if (PREMIUM_HINTS.some((h) => name.includes(h))) score += 8;
  if (v.default) score += 2;
  return score;
}

/** 自动选最佳中文声线；一条中文声线都没有时返回 null（交给浏览器按 lang 兜底） */
function pickVoice(): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const v of refreshVoices()) {
    const s = voiceScore(v);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/* ---------------- 队列管理：代际号 + 朗读入口 ---------------- */

export interface SpeakOptions {
  /** 语速 0.5–2.0，默认 1.0（越界自动收敛到边界） */
  rate?: number;
  /** 朗读结束回调（被更新的 speak 或 cancel 取代后不再触发） */
  onEnd?: () => void;
  /** 引擎 1 朗读出错回调 */
  onError?: () => void;
}

let generation = 0;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function clearFallbackTimer(): void {
  if (fallbackTimer !== null) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function clampRate(rate: number | undefined): number {
  const r = typeof rate === "number" && Number.isFinite(rate) ? rate : 1;
  return Math.min(2, Math.max(0.5, r));
}

/** 朗读一段文字。任意时刻最多一段：新的 speak 自动取消旧的（旧 onEnd 不触发）。 */
export function speak(text: string, options: SpeakOptions = {}): void {
  // 先作废上一段（含空文本情形）：任何新的 speak 都不允许与旧朗读重叠
  const gen = ++generation;
  clearFallbackTimer();

  if (!text) {
    options.onEnd?.();
    return;
  }

  // —— 引擎 2：节拍模拟（不支持 / 用户关闭时兜底；中文 ≈ 每字 250ms，封顶 8s）
  if (!isSupported || !enabled) {
    const ms = Math.min((text.length * 250) / clampRate(options.rate), 8000);
    fallbackTimer = setTimeout(() => {
      if (gen === generation) {
        fallbackTimer = null;
        options.onEnd?.();
      }
    }, ms);
    return;
  }

  // —— 引擎 1：SpeechSynthesis
  // cancel() 与 speak() 同拍紧邻时 Chrome 偶发吞声，推迟到下一拍再开口。
  window.speechSynthesis.cancel();
  window.setTimeout(() => {
    if (gen !== generation) return; // 这一拍里已被更新的 speak/cancel 取代
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = clampRate(options.rate);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (gen === generation) options.onEnd?.();
    };
    utterance.onerror = () => {
      if (gen === generation) options.onError?.();
    };
    window.speechSynthesis.resume(); // 解除 Chrome 偶发的 paused 卡死
    window.speechSynthesis.speak(utterance);
  }, 0);
}

/** 立即停止：真实朗读取消、模拟计时作废，两者的回调都不再触发 */
export function cancel(): void {
  generation += 1;
  clearFallbackTimer();
  if (isSupported) window.speechSynthesis.cancel();
}

/** 暂停当前朗读（仅引擎 1；引擎 2 的模拟计时不支持暂停） */
export function pause(): void {
  if (isSupported) window.speechSynthesis.pause();
}

/** 恢复当前朗读（仅引擎 1） */
export function resume(): void {
  if (isSupported) window.speechSynthesis.resume();
}
