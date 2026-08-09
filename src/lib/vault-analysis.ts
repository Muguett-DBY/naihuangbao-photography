import type { VaultAssetAnalysis } from "../types/vault-asset";

const ANALYSIS_SIZE = 32;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function channelSaturation(red: number, green: number, blue: number) {
  const high = Math.max(red, green, blue) / 255;
  const low = Math.min(red, green, blue) / 255;
  return high === 0 ? 0 : (high - low) / high;
}

function perceptualHash(luminance: number[]) {
  const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  let output = "";
  for (let offset = 0; offset < luminance.length; offset += 4) {
    let value = 0;
    for (let bit = 0; bit < 4; bit += 1) value = (value << 1) | (luminance[offset + bit] >= mean ? 1 : 0);
    output += value.toString(16);
  }
  return output;
}

export function analyzeVaultPixels(data: Uint8ClampedArray, width: number, height: number, sourceWidth = width, sourceHeight = height): VaultAssetAnalysis {
  if (data.length < width * height * 4 || width < 1 || height < 1) throw new Error("Invalid vault pixel buffer");
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let saturationTotal = 0;
  const cellLuminance: number[] = [];

  for (let cellY = 0; cellY < 8; cellY += 1) {
    for (let cellX = 0; cellX < 8; cellX += 1) {
      let cellTotal = 0;
      let cellSamples = 0;
      const startX = Math.floor((cellX / 8) * width);
      const endX = Math.max(startX + 1, Math.floor(((cellX + 1) / 8) * width));
      const startY = Math.floor((cellY / 8) * height);
      const endY = Math.max(startY + 1, Math.floor(((cellY + 1) / 8) * height));
      for (let y = startY; y < Math.min(endY, height); y += 1) {
        for (let x = startX; x < Math.min(endX, width); x += 1) {
          const offset = (y * width + x) * 4;
          const red = data[offset];
          const green = data[offset + 1];
          const blue = data[offset + 2];
          redTotal += red;
          greenTotal += green;
          blueTotal += blue;
          saturationTotal += channelSaturation(red, green, blue);
          cellTotal += (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
          cellSamples += 1;
        }
      }
      cellLuminance.push(cellTotal / Math.max(1, cellSamples));
    }
  }

  const sampleCount = width * height;
  const colorVector: [number, number, number] = [redTotal / sampleCount, greenTotal / sampleCount, blueTotal / sampleCount];
  const luminance = cellLuminance.reduce((sum, value) => sum + value, 0) / cellLuminance.length;
  const variance = cellLuminance.reduce((sum, value) => sum + (value - luminance) ** 2, 0) / cellLuminance.length;
  const contrast = clamp(Math.sqrt(variance) * 3.2);
  const saturation = clamp(saturationTotal / sampleCount);
  const megapixels = (sourceWidth * sourceHeight) / 1_000_000;
  const resolution = clamp(megapixels / 12);
  const exposure = 1 - Math.min(1, Math.abs(luminance - 0.52) / 0.52);
  const qualityScore = Math.round(clamp(resolution * 0.45 + contrast * 0.3 + exposure * 0.2 + saturation * 0.05) * 100);
  return {
    dominantColor: rgbToHex(...colorVector),
    colorVector,
    luminance,
    contrast,
    saturation,
    perceptualHash: perceptualHash(cellLuminance),
    qualityScore,
  };
}

export function deriveVaultTags(name: string, analysis: VaultAssetAnalysis) {
  const tags = new Set(name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2));
  tags.add(analysis.luminance > 0.68 ? "bright" : analysis.luminance < 0.32 ? "dark" : "midlight");
  tags.add(analysis.contrast > 0.55 ? "high-contrast" : "soft-contrast");
  tags.add(analysis.saturation > 0.48 ? "vivid" : "muted");
  const [red, green, blue] = analysis.colorVector;
  if (green > red * 1.08 && green > blue * 1.04) tags.add("green");
  else if (blue > red * 1.08) tags.add("cool");
  else if (red > blue * 1.12) tags.add("warm");
  else tags.add("neutral");
  return [...tags].slice(0, 12);
}

export function vaultHashDistance(left: string, right: string) {
  const length = Math.min(left.length, right.length);
  let distance = Math.abs(left.length - right.length) * 4;
  for (let index = 0; index < length; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += xor.toString(2).replace(/0/g, "").length;
  }
  return distance;
}

export async function analyzeVaultImage(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = ANALYSIS_SIZE;
  canvas.height = ANALYSIS_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Image analysis canvas is unavailable");
  }
  context.drawImage(bitmap, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
  const pixels = context.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;
  const result = analyzeVaultPixels(pixels, ANALYSIS_SIZE, ANALYSIS_SIZE, bitmap.width, bitmap.height);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { analysis: result, ...dimensions };
}
