import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildSSML,
  buildSSMLRequestMessage,
  buildSpeechConfigMessage,
  buildSynthUrl,
  EDGE_OUTPUT_FORMAT,
  generateSecMsGec,
  parseBinaryFrame,
  parseWordBoundaries,
  pickEdgeTransport,
  synthesizeViaProxy,
  TTS_PROXY_ENDPOINT,
  TRUSTED_CLIENT_TOKEN,
} from "./edge-tts";

/** 把字符串按字节保真转成 Uint8Array（测试里的帧构造器用） */
function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** 固定 MP3 样例字节（帧同步头 0xFFFB 开头，模拟真实音频负载） */
const MP3_SAMPLE = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x11, 0x22, 0x33, 0x44, 0x55]);

/** 构造一帧服务端 audio 消息（可选带官方协议的 2 字节大端头长前缀） */
function makeAudioFrame(withBinaryPrefix: boolean): Uint8Array {
  const head = bytesOf(`X-RequestId:${"a".repeat(32)}\r\nContent-Type:audio/mpeg\r\nPath:audio\r\n`);
  const prefix = withBinaryPrefix ? new Uint8Array([0x00, head.length & 0xff]) : new Uint8Array(0);
  const out = new Uint8Array(prefix.length + head.length + MP3_SAMPLE.length);
  out.set(prefix, 0);
  out.set(head, prefix.length);
  out.set(MP3_SAMPLE, prefix.length + head.length);
  return out;
}

/** 服务端 audio.metadata 帧真实样例（本机抓包逐字节的 JSON 结构，含缩进） */
const METADATA_TEXT = `X-RequestId:${"a".repeat(32)}\r\nContent-Type:application/json; charset=utf-8\r\nPath:audio.metadata\r\n\r\n{
  "Metadata": [
    {
      "Type": "WordBoundary",
      "Data": {
        "Offset": 8125000,
        "Duration": 1375000,
        "text": {
          "Text": "我",
          "Length": 1,
          "BoundaryType": "WordBoundary"
        }
      }
    }
  ]
}`;

describe("generateSecMsGec（Sec-MS-GEC 防伪令牌）", () => {
  it("与 node:crypto 独立实现逐字符一致（浮点 tick 算术 + SHA-256 + 大写十六进制）", async () => {
    const nowMs = 1759712345678; // 固定时刻，保证可复现
    const gec = await generateSecMsGec(TRUSTED_CLIENT_TOKEN, nowMs);

    // 独立参考实现（node:crypto），算术与 msedge-tts@2.0.9 的 JS 浮点语义一致
    const ticks = Math.floor(nowMs / 1000) + 11644473600;
    const rounded = ticks - (ticks % 300);
    const expected = createHash("sha256")
      .update(`${rounded * 10000000}${TRUSTED_CLIENT_TOKEN}`)
      .digest("hex")
      .toUpperCase();

    expect(gec).toBe(expected);
    expect(gec).toMatch(/^[0-9A-F]{64}$/);
  });

  it("向下取整到 5 分钟窗：同窗内不同时刻产出同一令牌，跨窗变化", async () => {
    const inWindow = 1759712345678; // 距窗口起点 245s
    const laterInSameWindow = inWindow + 50_000; // +50s 仍在同一 300s 窗内
    expect(await generateSecMsGec(TRUSTED_CLIENT_TOKEN, inWindow))
      .toBe(await generateSecMsGec(TRUSTED_CLIENT_TOKEN, laterInSameWindow));
    expect(await generateSecMsGec(TRUSTED_CLIENT_TOKEN, inWindow))
      .not.toBe(await generateSecMsGec(TRUSTED_CLIENT_TOKEN, inWindow + 300_000));
  });
});

describe("buildSynthUrl（合成连接 URL）", () => {
  it("带 TrustedClientToken / Sec-MS-GEC / 版本 / 连接 id，端点路径正确", async () => {
    const url = await buildSynthUrl(1759712345678);
    expect(url.startsWith("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?")).toBe(true);
    expect(url).toContain(`TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`);
    expect(url).toContain("Sec-MS-GEC-Version=1-143.0.3650.96");
    expect(url).toMatch(/Sec-MS-GEC=[0-9A-F]{64}/);
    expect(url).toMatch(/ConnectionId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("buildSSML（SSML 构造器）", () => {
  it("默认声线 zh-CN-XiaoxiaoNeural、locale 从声线推断、prosody 默认值", () => {
    const ssml = buildSSML("你好");
    expect(ssml).toContain('xml:lang="zh-CN"');
    expect(ssml).toContain('<voice name="zh-CN-XiaoxiaoNeural">');
    expect(ssml).toContain('<prosody pitch="+0Hz" rate="+0%" volume="100">');
    expect(ssml).toContain(">你好</prosody>");
    expect(ssml.startsWith('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts"')).toBe(true);
  });

  it("XML 特殊字符全部转义（讲稿里的引号/尖括号不破坏 SSML）", () => {
    const ssml = buildSSML(`A&B<C>"引"'单'`);
    expect(ssml).toContain("A&amp;B&lt;C&gt;&quot;引&quot;&apos;单&apos;");
    // 非法注入不成立：构造结果只有一个 <speak 开头
    expect(ssml.match(/<speak /g)).toHaveLength(1);
  });

  it("支持自定义声线（locale 跟随）与自定义语速", () => {
    const ssml = buildSSML("hi", { voice: "en-US-AriaNeural", rate: "+10%" });
    expect(ssml).toContain('xml:lang="en-US"');
    expect(ssml).toContain('<voice name="en-US-AriaNeural">');
    expect(ssml).toContain('rate="+10%"');
  });
});

describe("请求消息构造", () => {
  it("speech.config：声明输出格式与词边界开关（true/false 两态）", () => {
    const on = buildSpeechConfigMessage(true);
    expect(on.startsWith(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`)).toBe(true);
    expect(on).toContain(`"outputFormat":"${EDGE_OUTPUT_FORMAT}"`);
    expect(on).toContain('"wordBoundaryEnabled":"true"');
    expect(on).toContain('"sentenceBoundaryEnabled":"false"');

    const off = buildSpeechConfigMessage(false);
    expect(off).toContain('"wordBoundaryEnabled":"false"');
  });

  it("ssml 请求：X-RequestId 头 + Path:ssml + 空行分隔 + 正文 trim", () => {
    const message = buildSSMLRequestMessage("  <speak>hi</speak>  ", "f".repeat(32));
    expect(message).toBe(
      `X-RequestId:${"f".repeat(32)}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak>hi</speak>`,
    );
  });
});

describe("parseBinaryFrame（二进制帧解析器）", () => {
  it("audio 帧：负载即 MP3 字节，逐字节一致（无前缀变体）", () => {
    const frame = parseBinaryFrame(makeAudioFrame(false));
    expect(frame?.path).toBe("audio");
    expect(frame?.requestId).toBe("a".repeat(32));
    expect(Array.from(frame?.payload ?? [])).toEqual([...MP3_SAMPLE]);
  });

  it("audio 帧：带官方 2 字节大端头长前缀（真实服务端形态）也解析正确", () => {
    const frame = parseBinaryFrame(makeAudioFrame(true));
    expect(frame?.path).toBe("audio");
    expect(Array.from(frame?.payload ?? [])).toEqual([...MP3_SAMPLE]);
  });

  it("audio.metadata 文本帧：字符串输入、requestId 回显、JSON 负载", () => {
    const frame = parseBinaryFrame(METADATA_TEXT);
    expect(frame?.path).toBe("audio.metadata");
    expect(frame?.requestId).toBe("a".repeat(32));
    const text = new TextDecoder().decode(frame?.payload ?? new Uint8Array());
    expect(text).toContain('"Type": "WordBoundary"');
  });

  it("turn.start / turn.end / response 帧正常分派", () => {
    for (const path of ["turn.start", "turn.end", "response"]) {
      const frame = parseBinaryFrame(`X-RequestId:abcdef\r\nPath:${path}\r\n\r\n{}`);
      expect(frame?.path).toBe(path);
      expect(frame?.requestId).toBe("abcdef");
    }
  });

  it("无 Path 头 / 空输入返回 null（安全降级）", () => {
    expect(parseBinaryFrame("hello world")).toBeNull();
    expect(parseBinaryFrame(new ArrayBuffer(0))).toBeNull();
  });
});

describe("parseWordBoundaries（词边界元数据）", () => {
  it("服务端真实样例：Type=WordBoundary，100ns tick 换算为毫秒", () => {
    const frame = parseBinaryFrame(METADATA_TEXT);
    const boundaries = parseWordBoundaries(frame?.payload ?? new Uint8Array());
    expect(boundaries).toEqual([{ text: "我", offsetMs: 812.5, durationMs: 137.5 }]);
  });

  it("兼容 WordBoundaryMetadata 变体并过滤无关条目；坏 JSON 安全返回空", () => {
    const payload = bytesOf(JSON.stringify({
      Metadata: [
        { Type: "WordBoundaryMetadata", Data: { Offset: 1000000, Duration: 4750000, text: { Text: "你好" } } },
        { Type: "SessionEndMetadata", Data: {} },
      ],
    }));
    expect(parseWordBoundaries(payload)).toEqual([{ text: "你好", offsetMs: 100, durationMs: 475 }]);
    expect(parseWordBoundaries(bytesOf("not-json{"))).toEqual([]);
    expect(parseWordBoundaries(bytesOf('{"nope":true}'))).toEqual([]);
  });
});

describe("pickEdgeTransport（通道选择）", () => {
  it("Edge 浏览器 UA（含 Edg/）→ direct 直连", () => {
    expect(pickEdgeTransport("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0")).toBe("direct");
  });

  it("Chrome / Electron / 空 UA → proxy（端点只认 Edg/，浏览器不可自定义 UA）", () => {
    expect(pickEdgeTransport("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36")).toBe("proxy");
    expect(pickEdgeTransport("Mozilla/5.0 ZCode/3.14.4 Chrome/146.0.0.0 Electron/41.0.3 Safari/537.36")).toBe("proxy");
    expect(pickEdgeTransport("")).toBe("proxy");
  });

  it("Edge 大小写敏感边界：小写 edg/ 不算（真实 UA 恒为大写 Edg/）", () => {
    expect(pickEdgeTransport("chrome edg/1.0")).toBe("proxy");
  });
});

describe("synthesizeViaProxy（同域代理合成）", () => {
  it("POST /api/tts 带 public-action 头与 JSON 负载；音频字节原样返回", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(MP3_SAMPLE, { status: 200, headers: { "content-type": "audio/mpeg" } });
    }) as typeof fetch;
    try {
      let firstPacket = 0;
      const result = await synthesizeViaProxy("法律部门又称部门法。", {
        voice: "zh-CN-XiaoxiaoNeural",
        rate: "+10%",
        onFirstPacket: () => (firstPacket += 1),
      });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(TTS_PROXY_ENDPOINT);
      const headers = new Headers(calls[0].init.headers);
      expect(headers.get("x-nhb-public-action")).toBe("1");
      const body = JSON.parse(String(calls[0].init.body)) as { text: string; voice: string; rate: string };
      expect(body).toEqual({ text: "法律部门又称部门法。", voice: "zh-CN-XiaoxiaoNeural", rate: "+10%" });
      expect(result.byteLength).toBe(MP3_SAMPLE.length);
      expect(new Uint8Array(result.audio)).toEqual(MP3_SAMPLE);
      expect(firstPacket).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("非 2xx 拒绝：抛错交给调用方回退", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("gone", { status: 503 })) as typeof fetch;
    try {
      await expect(synthesizeViaProxy("x")).rejects.toThrow(/HTTP 503/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("已 abort 的 signal：直接抛 AbortError 不发请求", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("fetch should not be called");
    }) as typeof fetch;
    try {
      const controller = new AbortController();
      controller.abort();
      await expect(synthesizeViaProxy("x", { signal: controller.signal })).rejects.toThrow("aborted");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
