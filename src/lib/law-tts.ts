/**
 * TTS 语音层：浏览器 SpeechSynthesis 为主，自动选最佳中文声线。
 * Edge TTS WebSocket 可以后续叠加为高质量增强，接口不变。
 *
 * 设计：
 * - speak(text, { rate?, onEnd? }) — 朗读一段文字，结束后回调
 * - cancel() — 立即停止当前朗读
 * - pause() / resume()
 * - isSupported — 浏览器是否支持
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;
let _enabled = true;

/** 是否有可用语音 */
export const isTtsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

/** 用户是否开启了语音 */
export function isTtsEnabled(): boolean {
  return _enabled;
}
export function setTtsEnabled(v: boolean) {
  _enabled = v;
  if (!v) cancel();
}

/** 找最佳中文声线 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // 优先：中文声线 → 默认声线 → 第一个
  return (
    voices.find((v) => v.lang.startsWith("zh") && v.localService) ??
    voices.find((v) => v.lang.startsWith("zh")) ??
    voices.find((v) => v.default) ??
    voices[0]
  );
}

export interface SpeakOptions {
  /** 语速 0.5-2.0，默认 1.0 */
  rate?: number;
  /** 朗读结束回调 */
  onEnd?: () => void;
  /** 朗读出错回调 */
  onError?: () => void;
}

/** 朗读一段文字 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isTtsSupported || !_enabled) {
    // 不支持或关闭时，用定时器模拟朗读时长（中文 ≈ 150字/分钟 → 每字 400ms）
    const ms = text.length * 250;
    if (options.onEnd) setTimeout(options.onEnd, Math.min(ms, 8000));
    return;
  }
  cancel(); // 先停掉之前的
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = options.rate ?? 1.0;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => { options.onEnd?.(); };
  utterance.onerror = () => { options.onError?.(); };
  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

/** 立即停止 */
export function cancel(): void {
  if (isTtsSupported) speechSynthesis.cancel();
  currentUtterance = null;
}

/** 暂停 */
export function pause(): void {
  if (isTtsSupported) speechSynthesis.pause();
}

/** 恢复 */
export function resume(): void {
  if (isTtsSupported) speechSynthesis.resume();
}
