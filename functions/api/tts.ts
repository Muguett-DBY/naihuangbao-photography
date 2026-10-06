import { badRequest, unavailable } from "../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../_security";
import { validateString } from "../_validation";

/**
 * Edge TTS 同域代理：speech.platform.bing.com 校验 User-Agent 必须含 Edg/，
 * 而浏览器禁止自定义 UA —— 非 Edge 浏览器直连必 403。由 Worker 补齐请求头，
 * 让所有浏览器都能用上课堂神经嗓音（Edge 用户仍走浏览器直连，不经此代理）。
 *
 * 请求：POST { text, voice?, rate? }，需 x-nhb-public-action: 1
 * 响应：audio/mpeg 字节流（客户端已做内存缓存与回退，此处不缓存）
 */

const EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const GEC_VERSION = "1-143.0.3650.96";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const MAX_TEXT = 800;
const UPSTREAM_TIMEOUT_MS = 25_000;

const VOICE_RE = /^[a-z]{2}-[A-Z]{2}-\w+Neural$/;
const RATE_RE = /^[+-]\d{1,3}%$/;

/** Sec-MS-GEC 防伪令牌：与 src/lib/edge-tts.ts 同一算法（5 分钟窗 SHA-256，勿改 BigInt 语义） */
async function secMsGec(nowMs = Date.now()): Promise<string> {
  const ticks = Math.floor(nowMs / 1000) + 11644473600;
  const windowsTicks = (ticks - (ticks % 300)) * 10_000_000;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${windowsTicks}${TRUSTED_CLIENT_TOKEN}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, voice: string, rate: string): string {
  const locale = /^\w{2}-\w{2}/.exec(voice)?.[0] ?? "zh-CN";
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${voice}"><prosody rate="${rate}" pitch="+0Hz" volume="100">` +
    xmlEscape(text) +
    `</prosody></voice></speak>`
  );
}

interface TtsBody {
  text?: string;
  voice?: string;
  rate?: string;
}

/** 从一条上游二进制帧里剥出 audio 负载（头部区 `Path:audio\r\n` 之后是裸 MP3 字节） */
function audioPayloadOf(frame: ArrayBuffer): Uint8Array | null {
  const bytes = new Uint8Array(frame);
  const headLen = Math.min(bytes.length, 2048);
  let head = "";
  for (let i = 0; i < headLen; i += 1) head += String.fromCharCode(bytes[i]);
  const at = head.indexOf("Path:audio\r\n");
  if (at < 0) return null;
  return bytes.subarray(at + "Path:audio\r\n".length);
}

async function synthesize(text: string, voice: string, rate: string): Promise<ArrayBuffer> {
  const gec = await secMsGec();
  const url =
    `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${gec}` +
    `&Sec-MS-GEC-Version=${GEC_VERSION}&ConnectionId=${crypto.randomUUID()}`;
  // Workers 的 WebSocket 客户端：fetch + Upgrade 头，运行时自动生成握手 key
  const upstream = await fetch(url.replace("wss://", "https://"), {
    headers: { Upgrade: "websocket", "User-Agent": EDGE_UA },
  });
  const socket = upstream.webSocket;
  if (!socket) throw new Error(`tts upstream did not upgrade (HTTP ${upstream.status})`);

  socket.accept();
  socket.send(
    `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
              outputFormat: OUTPUT_FORMAT,
            },
          },
        },
      }),
  );
  const requestId = [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  socket.send(
    `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${buildSsml(text, voice, rate)}`,
  );

  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tts upstream timeout (${UPSTREAM_TIMEOUT_MS}ms)`)), UPSTREAM_TIMEOUT_MS);
    const finish = (fn: () => void) => {
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      fn();
    };
    // workerd 本地与生产都以 Blob 交付二进制帧（浏览器端才是 ArrayBuffer），两种都收
    async function onMessage(event: MessageEvent) {
      const data: unknown = event.data;
      if (typeof data === "string") {
        if (data.includes("Path:turn.end")) finish(resolve);
        return;
      }
      const buffer = data instanceof ArrayBuffer
        ? data
        : typeof (data as Blob).arrayBuffer === "function"
          ? await (data as Blob).arrayBuffer()
          : null;
      if (!buffer) return;
      const payload = audioPayloadOf(buffer);
      if (payload && payload.length > 0) chunks.push(payload.slice());
    }
    function onClose() {
      finish(() => reject(new Error("tts upstream closed before turn.end")));
    }
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
  });
  socket.close();

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out.buffer;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const guard = requirePublicMutationRequest(context.request);
  if (guard) return guard;

  const limit = await enforceRateLimit(context.request, context.env, "law-tts", 60, 600);
  if (!limit.ok) return rateLimited(limit.retryAfter, 60);

  const body = (await context.request.json().catch(() => ({}))) as TtsBody;
  const text = (body.text ?? "").trim();
  if (!text) return badRequest("缺少文本");
  const textCheck = validateString(text, "文本", MAX_TEXT);
  if (!textCheck.valid) return badRequest(textCheck.error);

  const voice = body.voice ?? "zh-CN-XiaoxiaoNeural";
  if (!VOICE_RE.test(voice)) return badRequest("不支持的声线");
  const rate = body.rate ?? "+0%";
  if (!RATE_RE.test(rate)) return badRequest("不支持的语速");

  try {
    const audio = await synthesize(text, voice, rate);
    return new Response(audio, {
      headers: { "content-type": "audio/mpeg", "cache-control": "no-store" },
    });
  } catch (error) {
    return unavailable("语音合成暂时不可用", error, { route: "/api/tts", method: "POST" });
  }
};
