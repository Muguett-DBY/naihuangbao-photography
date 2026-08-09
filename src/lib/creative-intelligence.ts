import type { VisualAsset } from "../types/visual-asset";
import { cosineSimilarity, hammingDistance, tokenizeArchiveQuery, vectorizeArchiveQuery } from "./archive-intelligence";

export type CuratorPreset = "morning" | "botanical" | "coral" | "nocturne";
export type CuratedRole = "opening" | "breath" | "detail" | "turn" | "closing";

export type CuratedFrame = {
  asset: VisualAsset;
  score: number;
  role: CuratedRole;
  reason: string;
};

export type CuratedSequence = {
  query: string;
  preset: CuratorPreset;
  frames: CuratedFrame[];
  palette: string[];
  outline: {
    opening: string;
    development: string;
    closing: string;
  };
};

type PresetSignal = {
  label: string;
  keywords: string;
  luminance: number;
  saturation: number;
  colors: Array<[number, number, number]>;
};

export const CURATOR_PRESETS: Record<CuratorPreset, PresetSignal> = {
  morning: { label: "Cream Morning", keywords: "cream paper warm dawn soft translucent quiet", luminance: 0.72, saturation: 0.27, colors: [[241, 222, 177], [244, 235, 216], [218, 183, 147]] },
  botanical: { label: "Botanical Calm", keywords: "moss botanical leaf specimen green mineral calm", luminance: 0.54, saturation: 0.33, colors: [[72, 104, 76], [158, 173, 134], [228, 220, 184]] },
  coral: { label: "Coral Signal", keywords: "coral berry red print pigment tactile bold", luminance: 0.52, saturation: 0.52, colors: [[213, 105, 93], [128, 45, 66], [244, 206, 180]] },
  nocturne: { label: "Quiet Nocturne", keywords: "night glass shadow projection blue black luminous", luminance: 0.25, saturation: 0.38, colors: [[27, 37, 52], [74, 88, 92], [217, 184, 116]] },
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function colorDistance(left: readonly number[], right: readonly number[]) {
  return Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0)) / Math.sqrt(3 * 255 * 255);
}

function moodColorScore(asset: VisualAsset, preset: PresetSignal) {
  return 1 - Math.min(...preset.colors.map((color) => colorDistance(asset.colorVector, color)));
}

function roleFor(index: number, total: number): CuratedRole {
  if (index === 0) return "opening";
  if (index === total - 1) return "closing";
  if (index === Math.floor(total * 0.55)) return "turn";
  return index % 3 === 0 ? "breath" : "detail";
}

function scoreCandidates(query: string, preset: CuratorPreset, assets: readonly VisualAsset[]) {
  const signal = CURATOR_PRESETS[preset];
  const tokens = tokenizeArchiveQuery(`${query} ${signal.keywords}`);
  const queryVector = vectorizeArchiveQuery(`${query} ${signal.keywords}`);
  return assets.map((asset) => {
    const text = asset.analysis.searchText.toLocaleLowerCase("zh-CN");
    const matches = tokens.filter((token) => text.includes(token));
    const lexical = matches.length / Math.max(4, tokens.length);
    const semantic = clamp((cosineSimilarity(queryVector, asset.analysis.semanticVector) + 1) / 2);
    const light = 1 - Math.abs(asset.analysis.luminance - signal.luminance);
    const saturation = 1 - Math.abs(asset.analysis.saturation - signal.saturation);
    const color = moodColorScore(asset, signal);
    const score = lexical * 0.3 + semantic * 0.2 + light * 0.18 + saturation * 0.12 + color * 0.2;
    const strongest = [
      { value: color, label: "palette resonance" },
      { value: light, label: "light rhythm" },
      { value: semantic, label: "semantic mood" },
      { value: saturation, label: "color restraint" },
    ].sort((left, right) => right.value - left.value).slice(0, 2).map((entry) => entry.label);
    return { asset, baseScore: score, reason: matches.length ? `${matches.slice(0, 2).join(" + ")} / ${strongest.join(" + ")}` : strongest.join(" + ") };
  }).sort((left, right) => right.baseScore - left.baseScore || left.asset.id.localeCompare(right.asset.id, "en"));
}

export function curateVisualSequence(query: string, assets: readonly VisualAsset[], requestedCount: 6 | 12 | 24, preset: CuratorPreset = "morning"): CuratedSequence {
  const candidates = scoreCandidates(query, preset, assets);
  const count = Math.min(requestedCount, candidates.length);
  const selected: typeof candidates = [];
  const remaining = [...candidates];

  while (selected.length < count && remaining.length) {
    const previous = selected.at(-1)?.asset;
    const desiredOrientation = selected.length % 3 === 0 ? "landscape" : selected.length % 3 === 1 ? "portrait" : "square";
    remaining.sort((left, right) => {
      const adjusted = (candidate: typeof left) => {
        if (!previous) return candidate.baseScore;
        const hashDiversity = clamp(hammingDistance(previous.analysis.perceptualHash, candidate.asset.analysis.perceptualHash) / 28);
        const tonalStep = clamp(Math.abs(previous.analysis.luminance - candidate.asset.analysis.luminance) / 0.32);
        const orientation = candidate.asset.orientation === desiredOrientation ? 1 : 0;
        return candidate.baseScore * 0.72 + hashDiversity * 0.16 + tonalStep * 0.08 + orientation * 0.04;
      };
      return adjusted(right) - adjusted(left) || left.asset.id.localeCompare(right.asset.id, "en");
    });
    const nonDuplicateIndex = previous ? remaining.findIndex((candidate) => hammingDistance(previous.analysis.perceptualHash, candidate.asset.analysis.perceptualHash) >= 5) : 0;
    selected.push(remaining.splice(nonDuplicateIndex >= 0 ? nonDuplicateIndex : 0, 1)[0]);
  }

  const frames = selected.map((candidate, index): CuratedFrame => ({
    asset: candidate.asset,
    score: Math.round(candidate.baseScore * 100),
    role: roleFor(index, selected.length),
    reason: candidate.reason,
  }));
  const palette = [...new Set(frames.flatMap(({ asset }) => asset.palette.length ? asset.palette : [asset.dominantColor]))].slice(0, 7);
  const first = frames[0]?.asset.descriptors[0] ?? "light";
  const middle = frames[Math.floor(frames.length / 2)]?.asset.descriptors[0] ?? "material";
  const last = frames.at(-1)?.asset.descriptors[0] ?? "quiet";

  return {
    query,
    preset,
    frames,
    palette,
    outline: {
      opening: `Enter through ${first}; establish the visual temperature before adding information.`,
      development: `Alternate detail and breathing frames around ${middle} to keep the sequence elastic.`,
      closing: `Resolve with ${last}; leave a quieter final image than the turning point.`,
    },
  };
}
