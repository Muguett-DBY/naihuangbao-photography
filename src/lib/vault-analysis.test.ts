import { describe, expect, it } from "vitest";
import { analyzeVaultPixels, deriveVaultTags, vaultHashDistance } from "./vault-analysis";

function pixels(width: number, height: number, color: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
  }
  return data;
}

describe("vault image analysis", () => {
  it("extracts stable color, light, hash, and quality signals", () => {
    const analysis = analyzeVaultPixels(pixels(8, 8, [220, 180, 120]), 8, 8, 4000, 3000);
    expect(analysis.dominantColor).toBe("#dcb478");
    expect(analysis.luminance).toBeGreaterThan(0.68);
    expect(analysis.perceptualHash).toMatch(/^[0-9a-f]{16}$/);
    expect(analysis.qualityScore).toBeGreaterThan(40);
    expect(deriveVaultTags("Cream Table.JPG", analysis)).toEqual(expect.arrayContaining(["cream", "table", "bright", "warm"]));
  });

  it("measures perceptual hash distance", () => {
    expect(vaultHashDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(vaultHashDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
});
