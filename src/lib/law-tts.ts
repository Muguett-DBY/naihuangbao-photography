import { safeLocalStorage } from "./browser-storage";
import { edgeTtsAvailable, synthesizeEdge, type EdgeWordBoundary } from "./edge-tts";

/**
 * TTS 语音抽象层（三引擎，零外部依赖）：
 *
 * 引擎 1（优先）：Edge TTS —— 浏览器 WebSocket 直连微软朗读服务（见 edge-tts.ts），
 *   zh-CN-XiaoxiaoNeural 神经声线，MP3 经 <audio> 播放。首包 1.5 秒超时或任何
 *   错误即无缝回退引擎 2，用户无感；端点连续失败 60 秒内不再尝试（避免每个
 *   场景都白等超时）。讲稿按文本哈希做内存缓存（上限 50 条，LRU），语速变化
 *   不重新合成 —— 同一段音频用 audio.playbackRate 变速重放；场景切换时旧
 *   合成 abort、旧音频即停。
 * 引擎 2（兜底）：浏览器 SpeechSynthesis API —— 零依赖、离线可用；
 *   自动挑选最佳中文声线（zh-CN 本地声线优先，已知高质量神经音色加权）。
 * 引擎 3（保底）：节拍模拟 —— 环境不支持或用户关闭时，按中文语速估算
 *   朗读时长走定时器，保证 speak 的 onEnd 节奏依然成立（课堂流程不会
 *   卡在"等朗读结束"，也不会在无语音环境里重叠推进）。
 *
 * 接口：
 * - isSupported —— 环境是否支持 SpeechSynthesis（引擎 2；引擎 1 可用性在
 *   speak 时独立探测，两者都不支持才走节拍模拟）
 * - speak(text, { rate?, onEnd?, onError?, onWordBoundary? }) —— 朗读一段文字
 * - setPlaybackRate(rate) —— 语速热更新：不重讲。引擎 1 原地改当前 <audio>
 *   的 playbackRate（同一音频续走）；引擎 2/3 只记录新语速对下一句生效
 *   （当前句不打断、不重启）
 * - cancel() —— 立即停止（三种引擎一并作废）
 * - pause() / resume() —— 暂停 / 恢复（引擎 1、2 有真实暂停语义）
 * - setTtsEnabled(bool) / isTtsEnabled() —— 用户总开关，关闭即静默并停止
 *
 * 队列管理：任意时刻最多一段朗读 —— 新的 speak 自动取消旧的；被取消
 * 一方的 onEnd/onError 一律不再触发（代际号作废，回调永不串扰）。
 *
 * 开关状态持久化到 localStorage（key 风格同 law-sound），刷新后仍记住用户选择。
 */

const TTS_ENABLED_KEY = "nhb-law-tts";

/** Edge 首包超时预算（与 edge-tts 默认一致，这里显式传便于语义集中） */
const EDGE_FIRST_PACKET_TIMEOUT_MS = 1500;
/**
 * Edge 端点失败后的冷静期：期间直接走引擎 2，不让每个场景都白等超时。
 * 指数退避：首次 12s，连续失败翻倍至 96s 封顶——单次网络抖动只损失一场的
 * 神经嗓音，而不是把整课都打成机器人声（2026-10 用户反馈「声音机械」）。
 */
const EDGE_BACKOFF_BASE_MS = 12000;
const EDGE_BACKOFF_MAX_MS = 96000;
/** 讲稿音频缓存上限（条） */
const EDGE_CACHE_MAX = 50;

/** 环境是否支持浏览器语音合成（引擎 2） */
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

/* ---------------- 引擎 2：中文声线自动挑选 ---------------- */

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

/** 词边界事件：Edge 引擎给文本+毫秒偏移；SpeechSynthesis 引擎只给 charIndex */
export interface WordBoundaryEvent {
  /** 词文本（Edge 引擎；引擎 2 为空串） */
  text: string;
  /** 相对本次朗读音频开头的偏移（毫秒；引擎 2 为 0） */
  offsetMs: number;
  /** 词时长（毫秒；引擎 2 为 0） */
  durationMs: number;
  /** 字符下标（引擎 2 的 utterance.onboundary；Edge 引擎缺省） */
  charIndex?: number;
}

export interface SpeakOptions {
  /** 语速 0.5–2.0，默认 1.0（越界自动收敛到边界；Edge 引擎用 playbackRate 变速，不重新合成） */
  rate?: number;
  /** 朗读结束回调（被更新的 speak 或 cancel 取代后不再触发） */
  onEnd?: () => void;
  /** 引擎 2 朗读出错回调（引擎 1 出错时静默回退引擎 2，不触发） */
  onError?: () => void;
  /** 词边界回调（引擎 1 来自服务端 WordBoundary 元数据；引擎 2 来自 onboundary，可能不触发） */
  onWordBoundary?: (event: WordBoundaryEvent) => void;
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

/**
 * 当前语速（0.5–2.0）：speak 的显式 rate 与 setPlaybackRate 的汇合点。
 * speak 入口把显式 rate 汇入这里；三处开口（playEdge / 引擎 2 utterance /
 * 引擎 3 计时）一律读这里 —— 合成在途或句中变速只需记下，开口即生效。
 */
let currentRate = 1;

/* ---------------- 引擎 1：Edge TTS（合成缓存 + 播放） ---------------- */

interface EdgeCacheEntry {
  audio: ArrayBuffer;
  boundaries: EdgeWordBoundary[];
}

/** 讲稿 → MP3 内存缓存（Map 保持插入序：命中即续期，淘汰最旧 → LRU） */
const edgeCache = new Map<string, EdgeCacheEntry>();

/** FNV-1a 32 位文本哈希（缓存 key；长度入尾避免同哈希不同长的碰撞） */
function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}:${text.length.toString(16)}`;
}

function edgeCacheGet(key: string): EdgeCacheEntry | null {
  const entry = edgeCache.get(key);
  if (!entry) return null;
  edgeCache.delete(key);
  edgeCache.set(key, entry); // 触摸续期
  return entry;
}

function edgeCachePut(key: string, entry: EdgeCacheEntry): void {
  edgeCache.delete(key);
  edgeCache.set(key, entry);
  while (edgeCache.size > EDGE_CACHE_MAX) {
    const oldest = edgeCache.keys().next().value;
    if (oldest === undefined) break;
    edgeCache.delete(oldest);
  }
}

/** 正在播放的 Edge 音频（场景切换/取消时即停并回收 Blob URL） */
interface EdgePlayback {
  el: HTMLAudioElement;
  url: string;
  boundaries: EdgeWordBoundary[];
  fired: number;
  ticker: ReturnType<typeof setInterval> | null;
}

let edgePlayback: EdgePlayback | null = null;
let edgeSynthAbort: AbortController | null = null;
let edgeBackoffUntil = 0;
/** 连续失败次数（成功一次即清零）：驱动冷静期指数退避 */
let edgeConsecutiveFailures = 0;
let edgePaused = false; // pause() 落在合成等待期时，合成完成后不再自动开口

/** 引擎 1 环境探测（调用时判断，不在模块顶层读浏览器全局） */
function edgePlaybackAvailable(): boolean {
  return edgeTtsAvailable()
    && typeof Audio !== "undefined"
    && typeof Blob !== "undefined"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function";
}

/** 停掉正在播放的引擎 1 音频并回收 Blob URL（不动作废在途合成） */
function stopEdgePlaybackOnly(): void {
  if (edgePlayback) {
    if (edgePlayback.ticker !== null) clearInterval(edgePlayback.ticker);
    edgePlayback.el.pause();
    edgePlayback.el.src = "";
    URL.revokeObjectURL(edgePlayback.url);
    edgePlayback = null;
  }
}

/** 立即中止引擎 1：作废在途合成、停掉正在播放的音频（场景切换/取消共用） */
function abortEdge(): void {
  if (edgeSynthAbort) {
    edgeSynthAbort.abort();
    edgeSynthAbort = null;
  }
  stopEdgePlaybackOnly();
}

/** 播放缓存/新合成的 MP3：playbackRate 映射语速；onended 交还 onEnd */
function playEdge(gen: number, text: string, entry: EdgeCacheEntry, options: SpeakOptions): void {
  const url = URL.createObjectURL(new Blob([entry.audio], { type: "audio/mpeg" }));
  const el = new Audio(url);
  // 开口读当前语速：合成在途中的 setPlaybackRate 也能生效（显式 rate 已在 speak 入口汇入）
  el.playbackRate = currentRate;
  const state: EdgePlayback = { el, url, boundaries: entry.boundaries, fired: 0, ticker: null };
  edgePlayback = state;

  // 所有回调先确认自己仍是"当前播放"（场景切换后 edgePlayback 已换人/清空），
  // 防止旧音频的迟到事件干扰新场景的播放。
  el.onended = () => {
    if (edgePlayback !== state) return;
    stopEdgePlaybackOnly();
    if (gen === generation) options.onEnd?.();
  };
  const fallbackAfterPlaybackError = () => {
    if (edgePlayback !== state || gen !== generation) return;
    // 播放期错误属本机问题（非端点故障）：不进冷静期，直接无缝回退引擎 2
    stopEdgePlaybackOnly();
    fallbackFromEdge(gen, text, options);
  };
  el.onerror = fallbackAfterPlaybackError;

  // 词边界推进：按音频媒体时间（currentTime 不受 playbackRate 影响）对齐 offsetMs
  if (options.onWordBoundary && state.boundaries.length > 0) {
    state.ticker = setInterval(() => {
      if (gen !== generation || edgePlayback !== state) {
        clearInterval(state.ticker as ReturnType<typeof setInterval>);
        state.ticker = null;
        return;
      }
      const nowMs = el.currentTime * 1000;
      while (state.fired < state.boundaries.length && state.boundaries[state.fired].offsetMs <= nowMs) {
        const b = state.boundaries[state.fired];
        state.fired += 1;
        options.onWordBoundary?.({ text: b.text, offsetMs: b.offsetMs, durationMs: b.durationMs });
      }
    }, 100);
  }

  if (edgePaused) return; // 暂停落在合成等待期：合成完先挂起，resume() 再开口
  const played = el.play();
  if (played) played.catch(fallbackAfterPlaybackError);
}

/** 引擎 1 失败后的无缝兜底：有引擎 2 用引擎 2，否则节拍模拟保节奏 */
function fallbackFromEdge(gen: number, text: string, options: SpeakOptions): void {
  if (isSupported) speakWithSpeechSynthesis(gen, text, options);
  else speakWithBeatSimulation(gen, text, options);
}

/** 引擎 1 主流程：查缓存 → 命中即播；未命中建连合成（首包 1.5s 预算）→ 失败回退引擎 2 */
function startEdge(gen: number, text: string, options: SpeakOptions): void {
  const key = hashText(text);
  const cached = edgeCacheGet(key);
  if (cached) {
    playEdge(gen, text, cached, options);
    return;
  }
  const controller = new AbortController();
  edgeSynthAbort = controller;
  synthesizeEdge(text, {
    firstPacketTimeoutMs: EDGE_FIRST_PACKET_TIMEOUT_MS,
    signal: controller.signal,
  }).then((result) => {
    if (edgeSynthAbort === controller) edgeSynthAbort = null; // 只回收自己的控制器
    // 合成结果无论是否已被取代都值得入缓存（用户拖回本场即秒开）
    edgeCachePut(key, { audio: result.audio, boundaries: result.boundaries });
    edgeConsecutiveFailures = 0; // 成功即清零：下次失败从最短冷静期重新计
    if (gen !== generation) return;
    playEdge(gen, text, { audio: result.audio, boundaries: result.boundaries }, options);
  }).catch((error: unknown) => {
    if (edgeSynthAbort === controller) edgeSynthAbort = null;
    if (gen !== generation) return;
    if ((error as Error | undefined)?.name === "AbortError") return; // 只是场景切换作废，非端点故障
    // 首包超时 / 连接失败 / turn.end 前断开：端点当前不可用 → 指数退避冷静期 + 无缝回退
    edgeConsecutiveFailures += 1;
    const backoff = Math.min(EDGE_BACKOFF_BASE_MS * 2 ** (edgeConsecutiveFailures - 1), EDGE_BACKOFF_MAX_MS);
    edgeBackoffUntil = Date.now() + backoff;
    fallbackFromEdge(gen, text, options);
  });
}

/* ---------------- 引擎 2：SpeechSynthesis ---------------- */

/** 引擎 2：原 SpeechSynthesis 路径（引擎 1 不可用/失败时的无缝兜底） */
function speakWithSpeechSynthesis(gen: number, text: string, options: SpeakOptions): void {
  // cancel() 与 speak() 同拍紧邻时 Chrome 偶发吞声，推迟到下一拍再开口。
  window.speechSynthesis.cancel();
  window.setTimeout(() => {
    if (gen !== generation) return; // 这一拍里已被更新的 speak/cancel 取代
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = currentRate; // 开口读当前语速（显式 rate 已在 speak 入口汇入）
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (gen === generation) options.onEnd?.();
    };
    utterance.onerror = () => {
      if (gen === generation) options.onError?.();
    };
    utterance.onboundary = (event) => {
      if (gen !== generation) return;
      options.onWordBoundary?.({
        text: "",
        offsetMs: 0,
        durationMs: 0,
        charIndex: event.charIndex,
      });
    };
    // 解除 Chrome 偶发的 paused 卡死；但用户正暂停（pause 落在 Edge 在途窗口、
    // 回退抵达时已被 pause）时不得解除 —— 让 utterance 入队挂起，resume() 再开口，
    // 与引擎 1 的「合成完先挂起，resume() 再开口」语义对齐。
    if (!edgePaused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, 0);
}

/* ---------------- 引擎 3：节拍模拟 ---------------- */

/** 引擎 3：中文 ≈ 每字 250ms，封顶 8s（无语音环境 / 用户关闭时的保底节奏） */
function speakWithBeatSimulation(gen: number, text: string, options: SpeakOptions): void {
  const ms = Math.min((text.length * 250) / currentRate, 8000);
  fallbackTimer = setTimeout(() => {
    if (gen === generation) {
      fallbackTimer = null;
      options.onEnd?.();
    }
  }, ms);
}

/* ---------------- 朗读入口 ---------------- */

/** 朗读一段文字。任意时刻最多一段：新的 speak 自动取消旧的（旧 onEnd 不触发）。 */
export function speak(text: string, options: SpeakOptions = {}): void {
  // 先作废上一段（含空文本情形）：任何新的 speak 都不允许与旧朗读重叠；
  // 引擎 1 的在途合成与播放音频也在此一并 abort（场景切换即停旧声）。
  const gen = ++generation;
  clearFallbackTimer();
  abortEdge();
  edgePaused = false;
  // 显式 rate 即最新语速：记下，供在途变速（setPlaybackRate）后的开口处取用
  if (typeof options.rate === "number") currentRate = clampRate(options.rate);

  if (!text) {
    options.onEnd?.();
    return;
  }

  // —— 用户关闭：节拍模拟保节奏（与既有语义一致）
  if (!enabled) {
    speakWithBeatSimulation(gen, text, options);
    return;
  }

  // —— 引擎 1：Edge TTS（端点冷静期内不尝试，免每个场景白等超时）
  if (edgePlaybackAvailable() && Date.now() >= edgeBackoffUntil) {
    startEdge(gen, text, options);
    return;
  }

  // —— 引擎 2：SpeechSynthesis
  if (isSupported) {
    speakWithSpeechSynthesis(gen, text, options);
    return;
  }

  // —— 引擎 3：节拍模拟
  speakWithBeatSimulation(gen, text, options);
}

/**
 * 语速热更新：变速不重讲 —— 改的是「正在播的这一句」的快慢，不是从头再来。
 * 引擎 1：直接热更新当前 <audio> 的 playbackRate（同一音频原地变速，进度原地
 *   续走，不新建音频元素）；合成在途时只记新语速，playEdge 开口时生效。
 * 引擎 2 / 3：当前 utterance/计时的语速无法热改 —— 只记录新语速，下一句
 *   speak 生效，不打断、不重启当前句。
 */
export function setPlaybackRate(rate: number): void {
  currentRate = clampRate(rate);
  if (edgePlayback) edgePlayback.el.playbackRate = currentRate;
}

/** 立即停止：引擎 1 合成/播放、引擎 2 朗读、引擎 3 计时一并作废，回调都不再触发 */
export function cancel(): void {
  generation += 1;
  clearFallbackTimer();
  abortEdge();
  if (isSupported) window.speechSynthesis.cancel();
}

/** 暂停当前朗读（引擎 1、2 有真实暂停语义；引擎 3 的模拟计时不支持暂停） */
export function pause(): void {
  edgePaused = true;
  if (edgePlayback) edgePlayback.el.pause();
  if (isSupported) window.speechSynthesis.pause();
}

/** 恢复当前朗读（仅引擎 1、2；引擎 3 的模拟计时不支持暂停） */
export function resume(): void {
  edgePaused = false;
  if (edgePlayback) {
    const played = edgePlayback.el.play();
    if (played) played.catch(() => { /* 恢复失败保持静默，ended 语义不受影响 */ });
  }
  if (isSupported) window.speechSynthesis.resume();
}
