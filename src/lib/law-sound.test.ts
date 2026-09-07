import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLawSounds,
  isLawSoundEnabled,
  setLawSoundEnabled,
  type AudioContextLike,
} from "./law-sound";

interface RecordedTone {
  type: OscillatorType;
  freq: number;
  slideTo?: number;
  startAt: number;
  stopAt: number;
  peakGains: number[];
}

function mockContext(state: "running" | "suspended" = "running") {
  const tones: RecordedTone[] = [];
  let resumeCalls = 0;
  const ctx: AudioContextLike = {
    currentTime: 10,
    state,
    resume: async () => {
      resumeCalls += 1;
      ctx.state = "running";
    },
    createOscillator: () => {
      const tone: RecordedTone = { type: "sine", freq: 0, startAt: 0, stopAt: 0, peakGains: [] };
      tones.push(tone);
      return {
        get type() {
          return tone.type;
        },
        set type(value: OscillatorType) {
          tone.type = value;
        },
        frequency: {
          setValueAtTime: (v: number) => {
            tone.freq = v;
          },
          exponentialRampToValueAtTime: (v: number) => {
            tone.slideTo = v;
          },
        },
        connect: () => ({ connect: () => undefined }),
        start: (t: number) => {
          tone.startAt = t;
        },
        stop: (t: number) => {
          tone.stopAt = t;
        },
      };
    },
    // engine 对每枚音先 createOscillator 再 createGain → 最后一个 tone 即当前音
    createGain: () => {
      const tone = tones.at(-1);
      return {
        gain: {
          setValueAtTime: (v: number) => {
            if (v > 0.01 && tone) tone.peakGains.push(v);
          },
          exponentialRampToValueAtTime: (v: number) => {
            if (v > 0.01 && tone) tone.peakGains.push(v);
          },
        },
        connect: () => undefined,
      };
    },
    destination: {},
  };
  return { ctx, tones, resumeCalls: () => resumeCalls };
}

function stubWindow(reduceMotion: boolean) {
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    },
    matchMedia: (query: string) => ({
      matches: reduceMotion && query.includes("reduce"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  return map;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("law sounds synth", () => {
  it("correct = 上行双音：两枚正弦波，第二个频率更高", () => {
    const mock = mockContext();
    const played = createLawSounds(() => mock.ctx, () => true).play("correct");
    expect(played).toBe(true);
    expect(mock.tones).toHaveLength(2);
    expect(mock.tones[1].freq).toBeGreaterThan(mock.tones[0].freq);
    expect(mock.tones.every((tone) => tone.type === "sine")).toBe(true);
    // 都排在 currentTime 之后（立即发声）
    expect(mock.tones[0].startAt).toBeGreaterThanOrEqual(mock.ctx.currentTime);
  });

  it("wrong = 低频短促且向下滑音", () => {
    const mock = mockContext();
    createLawSounds(() => mock.ctx, () => true).play("wrong");
    expect(mock.tones).toHaveLength(1);
    expect(mock.tones[0].freq).toBeLessThan(300);
    expect(mock.tones[0].slideTo).toBeDefined();
    expect(mock.tones[0].slideTo!).toBeLessThan(mock.tones[0].freq);
  });

  it("step = 单枚极短轻点", () => {
    const mock = mockContext();
    createLawSounds(() => mock.ctx, () => true).play("step");
    expect(mock.tones).toHaveLength(1);
    expect(mock.tones[0].stopAt - mock.tones[0].startAt).toBeLessThanOrEqual(0.08);
  });

  it("egg = 三音琶音：三枚依次升调", () => {
    const mock = mockContext();
    createLawSounds(() => mock.ctx, () => true).play("egg");
    expect(mock.tones).toHaveLength(3);
    expect(mock.tones[1].freq).toBeGreaterThan(mock.tones[0].freq);
    expect(mock.tones[2].freq).toBeGreaterThan(mock.tones[1].freq);
    expect(mock.tones[1].startAt).toBeGreaterThan(mock.tones[0].startAt);
    expect(mock.tones[2].startAt).toBeGreaterThan(mock.tones[1].startAt);
  });

  it("所有音效保持轻柔（峰值增益 ≤ 0.09，不刺耳）", () => {
    for (const name of ["correct", "wrong", "step", "egg"] as const) {
      // 每种音效独立上下文：master 总线增益（0.9）不混进单音峰值记录
      const mock = mockContext();
      createLawSounds(() => mock.ctx, () => true).play(name);
      expect(mock.tones.length).toBeGreaterThan(0);
      for (const tone of mock.tones) {
        for (const gain of tone.peakGains) {
          expect(gain).toBeLessThanOrEqual(0.09);
        }
      }
    }
  });

  it("静音时不创建任何振荡器", () => {
    const mock = mockContext();
    const played = createLawSounds(() => mock.ctx, () => false).play("correct");
    expect(played).toBe(false);
    expect(mock.tones).toHaveLength(0);
  });

  it("环境不支持 AudioContext 时静默返回 false", () => {
    expect(createLawSounds(() => null, () => true).play("egg")).toBe(false);
  });

  it("suspended 上下文会尝试 resume（自动播放策略）", async () => {
    const mock = mockContext("suspended");
    createLawSounds(() => mock.ctx, () => true).play("correct");
    await Promise.resolve();
    expect(mock.resumeCalls()).toBe(1);
  });
});

describe("law sound preference", () => {
  it("显式开关优先于媒体偏好并持久化", () => {
    const map = stubWindow(true); // reduce 用户
    setLawSoundEnabled(true);
    expect(isLawSoundEnabled()).toBe(true);
    expect(map.get("nhb-law-sound")).toBe("on");
    setLawSoundEnabled(false);
    expect(isLawSoundEnabled()).toBe(false);
    expect(map.get("nhb-law-sound")).toBe("off");
  });

  it("未设置时：reduce 用户默认静音，普通用户默认开", () => {
    stubWindow(true);
    expect(isLawSoundEnabled()).toBe(false);
    vi.unstubAllGlobals();
    stubWindow(false);
    expect(isLawSoundEnabled()).toBe(true);
  });
});
