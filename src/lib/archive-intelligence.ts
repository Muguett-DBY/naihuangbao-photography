import type { VisualAsset } from "../types/visual-asset";

export type ArchiveSignal = {
  colorVector: [number, number, number];
  luminance: number;
};

export type ArchiveSearchResult = {
  asset: VisualAsset;
  score: number;
  reason: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function tokenizeArchiveQuery(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("zh-CN");
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const tokens = [...words];
  for (const word of words) {
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u.test(word)) {
      const characters = [...word];
      tokens.push(...characters);
      for (let index = 0; index < characters.length - 1; index += 1) tokens.push(`${characters[index]}${characters[index + 1]}`);
    }
  }
  return unique(tokens);
}

function tokenHash(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function vectorizeArchiveQuery(value: string, dimensions = 18) {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of tokenizeArchiveQuery(value)) {
    const hash = tokenHash(token);
    vector[hash % dimensions] += (hash & 1) === 0 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, entry) => sum + entry * entry, 0)) || 1;
  return vector.map((entry) => entry / magnitude);
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  return leftMagnitude && rightMagnitude ? dot / Math.sqrt(leftMagnitude * rightMagnitude) : 0;
}

export function searchVisualAssets(query: string, assets: readonly VisualAsset[], limit = 12): ArchiveSearchResult[] {
  const tokens = tokenizeArchiveQuery(query);
  if (!tokens.length) {
    return assets
      .filter((asset) => asset.src.includes("visual-os-v7"))
      .slice(0, limit)
      .map((asset) => ({ asset, score: 1, reason: "V7 NEW MATERIAL" }));
  }
  const queryVector = vectorizeArchiveQuery(query);
  return assets
    .map((asset) => {
      const haystack = asset.analysis.searchText.toLocaleLowerCase("zh-CN");
      const matchedTokens = tokens.filter((token) => haystack.includes(token));
      const lexical = matchedTokens.length / tokens.length;
      const semantic = clamp((cosineSimilarity(queryVector, asset.analysis.semanticVector) + 1) / 2);
      const score = lexical * 0.72 + semantic * 0.28;
      return {
        asset,
        score,
        reason: matchedTokens.length ? `MATCH / ${matchedTokens.slice(0, 3).join(" · ")}` : "SEMANTIC NEIGHBOR",
      };
    })
    .filter((result) => result.score > 0.12)
    .sort((left, right) => right.score - left.score || left.asset.id.localeCompare(right.asset.id, "en"))
    .slice(0, limit);
}

function colorSimilarity(signal: ArchiveSignal, asset: VisualAsset) {
  const distance = Math.sqrt(signal.colorVector.reduce((sum, channel, index) => sum + (channel - asset.colorVector[index]) ** 2, 0));
  return clamp(1 - distance / Math.sqrt(3 * 255 * 255));
}

export function rankAssetsBySignal(signal: ArchiveSignal, assets: readonly VisualAsset[], limit = 12): ArchiveSearchResult[] {
  return assets
    .map((asset) => {
      const color = colorSimilarity(signal, asset);
      const light = 1 - Math.abs(signal.luminance - asset.analysis.luminance);
      return { asset, score: color * 0.72 + light * 0.28, reason: `COLOR ${Math.round(color * 100)} / LIGHT ${Math.round(light * 100)}` };
    })
    .sort((left, right) => right.score - left.score || left.asset.id.localeCompare(right.asset.id, "en"))
    .slice(0, limit);
}

export function hammingDistance(left: string, right: string) {
  const length = Math.min(left.length, right.length);
  let distance = Math.abs(left.length - right.length) * 4;
  for (let index = 0; index < length; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}

export function constellationPosition(asset: VisualAsset, index: number) {
  const horizontal = asset.analysis.semanticVector[0] ?? 0;
  const vertical = asset.analysis.semanticVector[1] ?? 0;
  return {
    x: clamp(0.08 + ((horizontal + 1) / 2) * 0.72 + (index % 3) * 0.03),
    y: clamp(0.08 + ((vertical + 1) / 2) * 0.65 + (index % 4) * 0.025),
  };
}
