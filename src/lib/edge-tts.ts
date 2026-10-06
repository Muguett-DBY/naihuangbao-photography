/**
 * Edge TTS 浏览器端引擎（零依赖）—— 微软 Edge 朗读服务的 WebSocket 客户端。
 *
 * 协议与本机已验证跑通的 msedge-tts@2.0.9 对齐（参考本机
 * tts-test/synth_msedge.cjs 用同一包产出过可用 MP3）：
 * - 端点  wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1
 * - 令牌  TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4（msedge-tts 同款常量）
 * - 防伪  Sec-MS-GEC = SHA-256(Windows 文件时间(向下取整到 5 分钟) + 令牌) 十六进制大写，
 *         Sec-MS-GEC-Version=1-143.0.3650.96（与 msedge-tts@2.0.9 一致）
 * - 握手  连接建立后先发 speech.config（声明输出格式与词边界元数据开关），
 *         再发 X-RequestId + SSML 请求
 * - 收帧  服务端返回二进制帧：HTTP 风格头 + 空行分隔负载。按 Path 分派：
 *         turn.start / response 忽略；audio 帧头以 `Path:audio\r\n` 结尾，
 *         负载即 MP3 字节；audio.metadata 帧负载是 WordBoundary JSON；
 *         turn.end 表示本次合成完成。
 *
 * 浏览器兼容性说明：浏览器 WebSocket 不允许自定义请求头（User-Agent / Origin
 * 无法设置），本模块因此一个头都不发 —— 端点对无自定义头的连接同样放行
 * （已用 Node 原生 WebSocket 以完全相同的无头方式连通验证）。
 *
 * 环境探测全部延迟到调用时（不读顶层 window），同一份代码可在 Node 侧
 * （原生 WebSocket + WebCrypto）直接连通性验证，也便于单测注入 mock。
 */

/* ==================== 协议常量（与 msedge-tts@2.0.9 一致） ==================== */

export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
export const SEC_MS_GEC_VERSION = "1-143.0.3650.96";
/** AUDIO_24KHZ_48KBITRATE_MONO_MP3（本机验证过的输出格式） */
export const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
/** 课堂默认声线（奶黄包老师；本机验证过的音色） */
export const EDGE_VOICE = "zh-CN-XiaoxiaoNeural";

const JSON_XML_DELIM = "\r\n\r\n";
const AUDIO_DELIM = "Path:audio\r\n";

/** 首包超时：连接 + speech.config + 第一包音频的总预算（超过即判端点不可用） */
export const EDGE_FIRST_PACKET_TIMEOUT_MS = 1500;
/** 整段合成总超时（讲稿再长也不该挂死；超过按错误处理走回退） */
export const EDGE_TOTAL_TIMEOUT_MS = 30000;

/* ==================== Sec-MS-GEC 与连接 URL ==================== */

/**
 * Sec-MS-GEC 防伪令牌：当前时间换算 Windows 文件时间（100ns 为单位的 tick），
 * 向下取整到 5 分钟窗，拼接客户端令牌后取 SHA-256 十六进制大写。
 * 算术保持与 msedge-tts@2.0.9 的 JS 浮点实现逐字节一致（勿改 BigInt）。
 */
export async function generateSecMsGec(trustedClientToken: string, nowMs: number = Date.now()): Promise<string> {
  const ticks = Math.floor(nowMs / 1000) + 11644473600;
  const rounded = ticks - (ticks % 300);
  const windowsTicks = rounded * 10000000;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Edge TTS unavailable: WebCrypto subtle is missing (need a secure context)");
  const data = new TextEncoder().encode(`${windowsTicks}${trustedClientToken}`);
  const digest = await subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** UUID v4（连接 id，格式与 msedge-tts 的 generateUUID 相同） */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 合成连接 URL：令牌 + Sec-MS-GEC 防伪 + 版本 + 连接 id */
export async function buildSynthUrl(nowMs: number = Date.now()): Promise<string> {
  const secMsGec = await generateSecMsGec(TRUSTED_CLIENT_TOKEN, nowMs);
  return `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}`
    + `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${generateUUID()}`;
}

/* ==================== 请求构造 ==================== */

/** speech.config 消息：声明输出格式与词/句边界元数据开关（连接打开后先发这个） */
export function buildSpeechConfigMessage(wordBoundaryEnabled = true): string {
  const config = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: "false",
            wordBoundaryEnabled: wordBoundaryEnabled ? "true" : "false",
          },
          outputFormat: EDGE_OUTPUT_FORMAT,
        },
      },
    },
  };
  return `Content-Type:application/json; charset=utf-8\r\nPath:speech.config${JSON_XML_DELIM}${JSON.stringify(config)}`;
}

/** SSML 文本转义（讲稿是纯文本；&<>"' 进 XML 前必须转义） */
export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SSMLProsody {
  /** 声线 ShortName，默认 zh-CN-XiaoxiaoNeural */
  voice?: string;
  /** 语速，SSML 相对语法（"+0%"）；播放端调速走 playbackRate，这里保持 "+0%" */
  rate?: string;
  /** 音高，默认 "+0Hz" */
  pitch?: string;
  /** 音量，默认 "100" */
  volume?: string;
}

/** SSML 构造：模板结构与 msedge-tts 的 _SSMLTemplate 一致（文本已转义） */
export function buildSSML(text: string, options: SSMLProsody = {}): string {
  const voice = options.voice ?? EDGE_VOICE;
  const locale = /^\w{2}-\w{2}/.exec(voice)?.[0] ?? "zh-CN";
  const rate = options.rate ?? "+0%";
  const pitch = options.pitch ?? "+0Hz";
  const volume = options.volume ?? "100";
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${locale}">`
    + `<voice name="${voice}">`
    + `<prosody pitch="${pitch}" rate="${rate}" volume="${volume}">`
    + xmlEscape(text)
    + `</prosody></voice></speak>`;
}

/** SSML 请求消息：X-RequestId 头 + ssml 路径 + 空行 + SSML 正文 */
export function buildSSMLRequestMessage(ssml: string, requestId: string): string {
  return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml${JSON_XML_DELIM}${ssml.trim()}`;
}

/** 16 字节随机十六进制（请求 id，与 msedge-tts 的 randomHex(16) 一致） */
function randomHex16(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ==================== 帧解析 ==================== */

export interface EdgeFrame {
  /** Path 头的值：turn.start / response / audio.metadata / audio / turn.end … */
  path: string;
  /** X-RequestId 头（服务端回显请求 id）；缺失为 null */
  requestId: string | null;
  /** 负载字节：audio 帧 = MP3 字节；audio.metadata 帧 = JSON；其余为空或文本 */
  payload: Uint8Array;
}

/**
 * 解析一帧服务端消息（二进制帧：HTTP 风格头 + 分隔符 + 负载）。
 * 头部区按字节保真解码（latin1 语义，头都是 ASCII），只扫前 2KB 足够；
 * audio 帧的分隔符是 `Path:audio\r\n`（无空行，后跟裸 MP3 字节），
 * 其余帧以 `\r\n\r\n` 分隔。不是有效帧返回 null。
 */
export function parseBinaryFrame(data: ArrayBuffer | Uint8Array | string): EdgeFrame | null {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data instanceof Uint8Array
      ? data
      : new Uint8Array(data);
  if (bytes.length === 0) return null;

  const headLen = Math.min(bytes.length, 2048);
  let head = "";
  for (let i = 0; i < headLen; i += 1) head += String.fromCharCode(bytes[i]);

  const pathMatch = /Path:([^\r\n]+)/.exec(head);
  if (!pathMatch) return null;
  const path = pathMatch[1].trim();
  const requestId = /X-RequestId:([0-9a-fA-F]+)\r\n/.exec(head)?.[1] ?? null;

  const delim = path === "audio" ? AUDIO_DELIM : JSON_XML_DELIM;
  const at = head.indexOf(delim);
  const payloadStart = at >= 0 ? at + delim.length : bytes.length;
  return { path, requestId, payload: bytes.subarray(payloadStart) };
}

export interface EdgeWordBoundary {
  /** 该词的文本（服务端原样返回） */
  text: string;
  /** 相对音频开头的偏移（毫秒；服务端 100ns tick ÷ 10000） */
  offsetMs: number;
  /** 该词时长（毫秒） */
  durationMs: number;
}

/**
 * 解析 audio.metadata 帧负载：{"Metadata":[{"Type":"WordBoundary",
 * "Data":{"Offset":tick,"Duration":tick,"text":{"Text":"…"}}}]}。
 * 服务端实测 Type 为 "WordBoundary"（部分实现写作 "WordBoundaryMetadata"），
 * 两种都收；tick 换算成毫秒；坏 JSON / 其他类型一律安全跳过。
 */
export function parseWordBoundaries(payload: Uint8Array): EdgeWordBoundary[] {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return [];
  }
  const list = (json as { Metadata?: unknown[] } | null)?.Metadata;
  if (!Array.isArray(list)) return [];
  const out: EdgeWordBoundary[] = [];
  for (const item of list) {
    const entry = item as { Type?: string; Data?: { Offset?: number; Duration?: number; text?: { Text?: string } } };
    if (entry?.Type !== "WordBoundary" && entry?.Type !== "WordBoundaryMetadata") continue;
    out.push({
      text: entry.Data?.text?.Text ?? "",
      offsetMs: (entry.Data?.Offset ?? 0) / 10000,
      durationMs: (entry.Data?.Duration ?? 0) / 10000,
    });
  }
  return out;
}

/** 把分片音频拼成完整 ArrayBuffer（MP3 可直接喂给 <audio>） */
function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out.buffer;
}

/* ==================== 合成客户端（状态机） ==================== */

export interface EdgeSynthesisOptions {
  /** 声线 ShortName，默认 zh-CN-XiaoxiaoNeural */
  voice?: string;
  /** SSML 语速（如 "+10%"）；默认 "+0%"（播放端用 playbackRate 调速） */
  rate?: string;
  /** 首包超时毫秒，默认 1500 */
  firstPacketTimeoutMs?: number;
  /** 整段合成总超时毫秒，默认 30000 */
  totalTimeoutMs?: number;
  /** 是否请求词边界元数据，默认 true */
  wordBoundary?: boolean;
  /** 中断信号：abort 即关连接并拒绝（场景切换作废旧合成） */
  signal?: AbortSignal;
  /** 收到第一包音频时回调（-law-tts 用它确认端点活着） */
  onFirstPacket?: () => void;
}

export interface EdgeSynthesis {
  /** 完整 MP3 音频字节 */
  audio: ArrayBuffer;
  byteLength: number;
  /** 词边界元数据（wordBoundary=false 时为空数组） */
  boundaries: EdgeWordBoundary[];
}

/** 环境是否具备 Edge 引擎条件：WebSocket + WebCrypto（安全上下文） */
export function edgeTtsAvailable(): boolean {
  return typeof WebSocket !== "undefined"
    && !!globalThis.crypto?.subtle
    && typeof TextEncoder !== "undefined";
}

function clearTimeoutSafe(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer !== null) clearTimeout(timer);
}

/**
 * 合成一段文本为 MP3（一次性连接：建连 → speech.config → ssml 请求 →
 * 收齐 turn.end 即关闭）。任何失败（首包超时 / 总超时 / ws 错误 /
 * turn.end 前断开 / abort）都以 reject 收场，由调用方决定回退策略。
 */
export function synthesizeSpeech(text: string, options: EdgeSynthesisOptions = {}): Promise<EdgeSynthesis> {
  const firstPacketTimeoutMs = options.firstPacketTimeoutMs ?? EDGE_FIRST_PACKET_TIMEOUT_MS;
  const totalTimeoutMs = options.totalTimeoutMs ?? EDGE_TOTAL_TIMEOUT_MS;

  return new Promise<EdgeSynthesis>((resolve, reject) => {
    const WS = typeof WebSocket !== "undefined" ? WebSocket : undefined;
    if (!WS) {
      reject(new Error("Edge TTS unavailable: WebSocket is missing"));
      return;
    }
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (result: EdgeSynthesis) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    let firstPacketTimer: ReturnType<typeof setTimeout> | null = null;
    let totalTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;
    const chunks: Uint8Array[] = [];
    const boundaries: EdgeWordBoundary[] = [];
    let gotFirstPacket = false;

    const cleanup = () => {
      clearTimeoutSafe(firstPacketTimer);
      clearTimeoutSafe(totalTimer);
      firstPacketTimer = null;
      totalTimer = null;
      if (options.signal) options.signal.removeEventListener("abort", onAbort);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
        socket = null;
      }
    };

    const onAbort = () => {
      const err = new Error("Edge TTS synthesis aborted");
      err.name = "AbortError";
      fail(err);
    };

    const finish = () => {
      succeed({ audio: concatChunks(chunks), byteLength: chunks.reduce((s, c) => s + c.length, 0), boundaries });
    };

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener("abort", onAbort);
    }

    let opened = false;
    buildSynthUrl()
      .then((url) => {
        if (settled) return;
        socket = new WS(url);
        socket.binaryType = "arraybuffer";

        firstPacketTimer = setTimeout(() => {
          if (!gotFirstPacket) fail(new Error(`Edge TTS first packet timeout (${firstPacketTimeoutMs}ms)`));
        }, firstPacketTimeoutMs);
        totalTimer = setTimeout(() => {
          fail(new Error(`Edge TTS synthesis total timeout (${totalTimeoutMs}ms)`));
        }, totalTimeoutMs);

        socket.onopen = () => {
          opened = true;
          // 连接建立：先声明输出配置，再发 SSML 合成请求（顺序与 msedge-tts 一致）
          socket?.send(buildSpeechConfigMessage(options.wordBoundary ?? true));
          const ssml = buildSSML(text, { voice: options.voice, rate: options.rate });
          socket?.send(buildSSMLRequestMessage(ssml, randomHex16()));
        };

        socket.onmessage = (event: MessageEvent) => {
          const frame = parseBinaryFrame(event.data as ArrayBuffer | string);
          if (!frame) return;
          switch (frame.path) {
            case "audio": {
              if (!gotFirstPacket) {
                gotFirstPacket = true;
                clearTimeoutSafe(firstPacketTimer);
                firstPacketTimer = null;
                options.onFirstPacket?.();
              }
              if (frame.payload.length > 0) chunks.push(frame.payload.slice());
              break;
            }
            case "audio.metadata":
              boundaries.push(...parseWordBoundaries(frame.payload));
              break;
            case "turn.end":
              finish();
              break;
            default:
              break; // turn.start / response：忽略
          }
        };

        socket.onerror = () => {
          fail(new Error("Edge TTS WebSocket error"));
        };
        socket.onclose = () => {
          if (opened) fail(new Error("Edge TTS connection closed before turn.end"));
          else fail(new Error("Edge TTS connection failed"));
        };
      })
      .catch(fail);
  });
}

/* ==================== 传输通道（直连 / 同域代理） ==================== */

export type EdgeTransport = "direct" | "proxy";

/** 同域 Pages Function 代理（functions/api/tts.ts：Worker 补发 Edge UA） */
export const TTS_PROXY_ENDPOINT = "/api/tts";

/**
 * 通道选择：上游端点校验 User-Agent 必须含 Edg/（Edge 标识），而浏览器禁止自定义
 * UA —— Edge 用户直连最快（不经服务端），其余浏览器走同域代理，两者都失败时
 * 由调用方无缝回退 SpeechSynthesis。
 */
export function pickEdgeTransport(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): EdgeTransport {
  return /Edg\//.test(userAgent) ? "direct" : "proxy";
}

/** 走 /api/tts 代理合成：POST JSON → audio/mpeg 字节（词边界元数据代理侧未采集） */
export async function synthesizeViaProxy(
  text: string,
  options: Pick<EdgeSynthesisOptions, "voice" | "rate" | "signal" | "onFirstPacket"> = {},
): Promise<EdgeSynthesis> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      const err = new Error("Edge TTS synthesis aborted");
      err.name = "AbortError";
      throw err;
    }
    options.signal.addEventListener("abort", onAbort);
  }
  const totalTimer = setTimeout(() => controller.abort(), EDGE_TOTAL_TIMEOUT_MS);
  try {
    const response = await fetch(TTS_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
      body: JSON.stringify({ text, voice: options.voice ?? EDGE_VOICE, rate: options.rate ?? "+0%" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Edge TTS proxy failed: HTTP ${response.status}`);
    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) throw new Error("Edge TTS proxy returned empty audio");
    options.onFirstPacket?.();
    return { audio, byteLength: audio.byteLength, boundaries: [] };
  } finally {
    clearTimeout(totalTimer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** 统一入口：按当前浏览器自动选通道 */
export function synthesizeEdge(
  text: string,
  options: EdgeSynthesisOptions = {},
): Promise<EdgeSynthesis> {
  return pickEdgeTransport() === "direct" ? synthesizeSpeech(text, options) : synthesizeViaProxy(text, options);
}
