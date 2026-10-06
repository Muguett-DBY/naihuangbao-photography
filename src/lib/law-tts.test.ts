import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * law-tts 双引擎状态机测试（mock WebSocket / SpeechSynthesis / Audio）：
 * 验证「优先 Edge → 首包超时或任何错误 → 无缝回退 SpeechSynthesis」、
 * 讲稿哈希缓存 + playbackRate 语速映射、场景切换旧音频 abort、词边界回调。
 */

/* ==================== 测试替身 ==================== */

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  binaryType = "blob";
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose: ((event?: unknown) => void) | null = null;
  sent: (string | ArrayBuffer)[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string | ArrayBuffer): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({});
  }

  /* —— 测试驱动（模拟服务端行为） —— */
  serverOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }

  serverText(text: string): void {
    this.onmessage?.({ data: text });
  }

  serverAudio(mp3: Uint8Array): void {
    const head = new TextEncoder().encode(`X-RequestId:${"b".repeat(32)}\r\nContent-Type:audio/mpeg\r\nPath:audio\r\n`);
    const frame = new Uint8Array(head.length + mp3.length);
    frame.set(head, 0);
    frame.set(mp3, head.length);
    this.onmessage?.({ data: frame.buffer });
  }
}

class MockAudio {
  static instances: MockAudio[] = [];

  src: string;
  playbackRate = 1;
  currentTime = 0;
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playCalls = 0;
  pauseCalls = 0;

  constructor(src?: string) {
    this.src = src ?? "";
    MockAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCalls += 1;
  }
}

class MockUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onboundary: ((event: { charIndex?: number }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  getVoices: () => [] as SpeechSynthesisVoice[],
  cancel: vi.fn(),
  speak: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
};

const createObjectUrl = vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2)}`);
const revokeObjectUrl = vi.fn();

/* ==================== 固定样例 ==================== */

const MP3_SAMPLE = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0xaa, 0xbb, 0xcc]);
const METADATA_TEXT = `X-RequestId:${"b".repeat(32)}\r\nContent-Type:application/json; charset=utf-8\r\nPath:audio.metadata\r\n\r\n`
  + JSON.stringify({
    Metadata: [
      { Type: "WordBoundary", Data: { Offset: 1000000, Duration: 4750000, text: { Text: "你好", Length: 2, BoundaryType: "WordBoundary" } } },
    ],
  });
const TURN_END_TEXT = `X-RequestId:${"b".repeat(32)}\r\nContent-Type:application/json; charset=utf-8\r\nPath:turn.end\r\n\r\n`;

/** 服务端把一轮合成走完（turn.start → 音频 → 词边界 → turn.end） */
async function driveSuccessfulSynthesis(ws: MockWebSocket): Promise<void> {
  ws.serverOpen();
  ws.serverText(`X-RequestId:${"b".repeat(32)}\r\nPath:turn.start\r\n\r\n{}`);
  ws.serverAudio(MP3_SAMPLE);
  ws.serverText(METADATA_TEXT);
  ws.serverText(TURN_END_TEXT);
  await flushTicks(); // 合成 promise → 播放器创建
}

/**
 * 推进假时钟若干拍。Node 的 WebCrypto 摘要在真实事件循环（线程池回调）上
 * 解析，固定拍数会偶发不够 → 一律按条件等待：等 WebSocket 实例数超过基线。
 */
async function flushTicks(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

/** 模块加载时捕获真实 setTimeout（beforeEach 里 useFakeTimers 会替换全局定时器） */
const realSetTimeout = globalThis.setTimeout.bind(globalThis);

/** 真实宏任务让出一拍：摘要回调挂在真实事件循环上，纯假时钟推进（微任务）轮不到它 */
function yieldRealTick(): Promise<void> {
  return new Promise((resolve) => realSetTimeout(resolve, 0));
}

async function waitForWebSocketCount(baseline: number): Promise<void> {
  for (let i = 0; i < 100 && MockWebSocket.instances.length <= baseline; i += 1) {
    await vi.advanceTimersByTimeAsync(1); // 每拍 1ms，远小于 1500ms 首包预算
    await yieldRealTick(); // 显式让出真实宏任务：摘要回调在线程池上解析，纯微任务推进可能一直轮不到它
  }
  if (MockWebSocket.instances.length <= baseline) {
    throw new Error(`WebSocket instance did not appear (baseline=${baseline})`);
  }
}

async function loadLawTts() {
  return await import("./law-tts");
}

/* ==================== 测试 ==================== */

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  MockWebSocket.instances = [];
  MockAudio.instances = [];
  mockSpeechSynthesis.speak.mockReset();
  mockSpeechSynthesis.cancel.mockReset();
  mockSpeechSynthesis.pause.mockReset();
  mockSpeechSynthesis.resume.mockReset();
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
  // 浏览器全局替身（law-tts 在模块加载时探测 window.speechSynthesis，必须先装再 import）
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  vi.stubGlobal("window", {
    speechSynthesis: mockSpeechSynthesis,
    localStorage: undefined,
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  });
  // 只挂 URL 的两个静态方法（动整个 URL 会破坏 vitest 自身）
  (URL as unknown as Record<string, unknown>).createObjectURL = createObjectUrl;
  (URL as unknown as Record<string, unknown>).revokeObjectURL = revokeObjectUrl;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete (URL as unknown as Record<string, unknown>).createObjectURL;
  delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
});

describe("引擎 1：Edge TTS 优先路径", () => {
  it("握手顺序正确（先 speech.config 后 ssml），合成完成后经 <audio> 播放，语速映射 playbackRate", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("第一课讲稿", { rate: 1.25, onEnd });
    await waitForWebSocketCount(0);

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4");
    expect(ws.url).toMatch(/Sec-MS-GEC=[0-9A-F]{64}/);
    ws.serverOpen();
    expect(ws.sent[0]).toContain("Path:speech.config");
    expect(ws.sent[0]).toContain('"wordBoundaryEnabled":"true"');
    expect(ws.sent[1]).toContain("Path:ssml");
    expect(ws.sent[1]).toContain("zh-CN-XiaoxiaoNeural");
    expect(ws.sent[1]).toContain("第一课讲稿");

    await driveSuccessfulSynthesis(ws);

    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled(); // 引擎 1 成功，不碰引擎 2
    const audio = MockAudio.instances[0];
    expect(audio.playbackRate).toBe(1.25); // 语速 → playbackRate，未重新合成
    const blobUrl = audio.src;
    expect(blobUrl).toMatch(/^blob:mock-/);
    audio.onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(blobUrl); // Blob URL 回收（先于 src 置空读取）
  });

  it("词边界按音频媒体时间推进 onWordBoundary", async () => {
    const lawTts = await loadLawTts();
    const onBoundary = vi.fn();
    lawTts.speak("词边界讲稿", { onWordBoundary: onBoundary });
    await waitForWebSocketCount(0);
    await driveSuccessfulSynthesis(MockWebSocket.instances[0]);

    const audio = MockAudio.instances[0];
    audio.currentTime = 0.05; // 50ms：还没到 offsetMs=100
    await vi.advanceTimersByTimeAsync(100);
    expect(onBoundary).not.toHaveBeenCalled();

    audio.currentTime = 0.2; // 200ms：越过了 100ms 的"你好"
    await vi.advanceTimersByTimeAsync(100);
    expect(onBoundary).toHaveBeenCalledWith({ text: "你好", offsetMs: 100, durationMs: 475 });

    audio.currentTime = 0.2; // 时间没走：不重复触发
    await vi.advanceTimersByTimeAsync(300);
    expect(onBoundary).toHaveBeenCalledTimes(1);
  });
});

describe("首包超时 → 无缝回退 SpeechSynthesis（状态机）", () => {
  it("连接建立但 1.5 秒无首包：关闭 ws、回退引擎 2，onEnd 语义保持", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    const onError = vi.fn();
    lawTts.speak("网络很差的课", { onEnd, onError });
    await waitForWebSocketCount(0);

    const ws = MockWebSocket.instances[0];
    ws.serverOpen(); // 连上了，但服务端一直不回音频

    await vi.advanceTimersByTimeAsync(1500); // 首包预算到点
    await vi.advanceTimersByTimeAsync(1); // 回退路径的 setTimeout(0)

    expect(ws.readyState).toBe(MockWebSocket.CLOSED); // 旧连接已关闭
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1); // 无缝回退引擎 2
    const utterance = mockSpeechSynthesis.speak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe("网络很差的课");

    utterance.onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1); // 用户视角：朗读正常结束
    expect(onError).not.toHaveBeenCalled(); // 静默回退，不惊动调用方
  });

  it("WebSocket 连接错误：同样回退引擎 2", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("断网的课", { onEnd });
    await waitForWebSocketCount(0);

    MockWebSocket.instances[0].onerror?.({});
    await vi.advanceTimersByTimeAsync(1);

    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    (mockSpeechSynthesis.speak.mock.calls[0][0] as MockUtterance).onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("cancel() 于合成在途：连接关闭、不回退、回调不触发", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("被取消的讲稿", { onEnd });
    await waitForWebSocketCount(0);

    const ws = MockWebSocket.instances[0];
    ws.serverOpen();
    lawTts.cancel();

    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    await vi.advanceTimersByTimeAsync(5000); // 就算等到超时也不会回退
    await vi.advanceTimersByTimeAsync(1);
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("引擎 1 播放期出错（非端点问题）：静默回退引擎 2", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("播放出错的课", { onEnd });
    await waitForWebSocketCount(0);
    await driveSuccessfulSynthesis(MockWebSocket.instances[0]);

    MockAudio.instances[0].onerror?.();
    await vi.advanceTimersByTimeAsync(1);

    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    (mockSpeechSynthesis.speak.mock.calls[0][0] as MockUtterance).onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("暂停落在 Edge 在途窗口：回退引擎 2 只入队不开口，resume() 才开口（课堂播放器暂停语义）", async () => {
    const lawTts = await loadLawTts();
    lawTts.speak("暂停期回退的课", {});
    await waitForWebSocketCount(0);
    MockWebSocket.instances[0].serverOpen(); // 连上了，但服务端一直不回音频

    lawTts.pause(); // 用户在 Edge 等待期按下暂停（ClassroomPlayer !playing → tts.pause）
    await vi.advanceTimersByTimeAsync(1500); // 首包超时 → 回退引擎 2
    await vi.advanceTimersByTimeAsync(1); // 回退路径的 setTimeout(0)

    expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1); // utterance 已入队
    expect(mockSpeechSynthesis.resume).not.toHaveBeenCalled(); // 但未解除用户暂停、未抢开口

    lawTts.resume(); // 用户恢复播放（key 未变 → tts.resume）
    expect(mockSpeechSynthesis.resume).toHaveBeenCalledTimes(1); // 此时才解除暂停续读
  });
});

describe("讲稿哈希缓存 + 场景切换 abort", () => {
  it("同一段讲稿再次朗读命中缓存：不再建连，换语速只改 playbackRate", async () => {
    const lawTts = await loadLawTts();
    const onEnd1 = vi.fn();
    lawTts.speak("同一段讲稿", { rate: 1, onEnd: onEnd1 });
    await waitForWebSocketCount(0);
    await driveSuccessfulSynthesis(MockWebSocket.instances[0]);
    const audio1 = MockAudio.instances[0];
    audio1.onended?.();
    expect(onEnd1).toHaveBeenCalledTimes(1);

    const connectionsAfterFirst = MockWebSocket.instances.length;
    const onEnd2 = vi.fn();
    lawTts.speak("同一段讲稿", { rate: 1.5, onEnd: onEnd2 });
    await flushTicks(); // 缓存命中是同步路径；这里只等播放器就绪

    expect(MockWebSocket.instances.length).toBe(connectionsAfterFirst); // 缓存命中，零建连
    const audio2 = MockAudio.instances[1];
    expect(audio2.src).not.toBe(audio1.src);
    expect(audio2.playbackRate).toBe(1.5); // 1×/1.25×/1.5× 不重新合成
    audio2.onended?.();
    expect(onEnd2).toHaveBeenCalledTimes(1);
  });

  it("场景切换：旧合成在途即被 abort，新场景正常开口", async () => {
    const lawTts = await loadLawTts();
    const firstEnd = vi.fn();
    const secondEnd = vi.fn();
    lawTts.speak("第一场讲稿", { onEnd: firstEnd });
    await waitForWebSocketCount(0);
    const wsA = MockWebSocket.instances[0];
    wsA.serverOpen(); // 第一场还在等服务端

    lawTts.speak("第二场讲稿", { onEnd: secondEnd }); // 场景切换

    expect(wsA.readyState).toBe(MockWebSocket.CLOSED); // 旧合成立刻作废
    await waitForWebSocketCount(1);
    const wsB = MockWebSocket.instances[1];
    wsB.serverOpen();
    await driveSuccessfulSynthesis(wsB);

    MockAudio.instances[0].onended?.();
    expect(secondEnd).toHaveBeenCalledTimes(1);
    expect(firstEnd).not.toHaveBeenCalled(); // 被取代方的回调永不串扰
  });
});

describe("既有语义保持", () => {
  it("用户关闭语音：节拍模拟保节奏，不建任何连接", async () => {
    const lawTts = await loadLawTts();
    lawTts.setTtsEnabled(false);
    expect(lawTts.isTtsEnabled()).toBe(false);

    const onEnd = vi.fn();
    lawTts.speak("关闭语音的课", { onEnd });
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(8000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("空文本：立即 onEnd，零副作用", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("", { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("pause / resume 对引擎 1 有真实暂停语义", async () => {
    const lawTts = await loadLawTts();
    const onEnd = vi.fn();
    lawTts.speak("暂停恢复的课", { onEnd });
    await waitForWebSocketCount(0);
    await driveSuccessfulSynthesis(MockWebSocket.instances[0]);

    const audio = MockAudio.instances[0];
    expect(audio.playCalls).toBe(1); // 合成完自动开口
    lawTts.pause();
    expect(audio.pauseCalls).toBe(1); // 引擎 1 真暂停
    expect(mockSpeechSynthesis.pause).toHaveBeenCalledTimes(1); // 引擎 2 同步受控
    lawTts.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.playCalls).toBe(2); // 恢复续播

    audio.onended?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("缓存上限 50 条：第 51 条淘汰最旧（LRU），再读最旧条目会重新建连", async () => {
    const lawTts = await loadLawTts();
    // 合成 51 段互不相同的讲稿
    for (let i = 0; i < 51; i += 1) {
      lawTts.speak(`第${i}段讲稿的内容各不相同-${i}`);
      await waitForWebSocketCount(i);
      await driveSuccessfulSynthesis(MockWebSocket.instances[i]);
      MockAudio.instances[i]?.onended?.();
    }
    const afterFiftyOne = MockWebSocket.instances.length;
    expect(afterFiftyOne).toBe(51);

    // 第 0 段已被 LRU 淘汰 → 再次朗读要重新建连；第 1 段还在 → 命中缓存
    lawTts.speak(`第0段讲稿的内容各不相同-0`);
    await waitForWebSocketCount(afterFiftyOne);
    expect(MockWebSocket.instances.length).toBe(afterFiftyOne + 1);

    lawTts.speak(`第1段讲稿的内容各不相同-1`);
    await flushTicks();
    expect(MockWebSocket.instances.length).toBe(afterFiftyOne + 1); // 未淘汰，缓存命中
  });
});
