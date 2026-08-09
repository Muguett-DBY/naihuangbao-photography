import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const archiveManifestPath = join(root, "public", "archive-manifest.json");
const storySourcePath = join(root, "content", "stories");
const publicOutputPath = join(root, "public", "visual-asset-manifest.json");
const appOutputPath = join(root, "src", "data", "visual-assets.generated.json");
const archiveManifest = JSON.parse(await readFile(archiveManifestPath, "utf8"));

function stableAssetId(src) {
  return src
    .replace(/^\/images\//, "")
    .replace(/\.(?:avif|webp|png|jpe?g)$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function colorVector(hex) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "7f7568";
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function orientation(width, height) {
  if (Math.abs(width / height - 1) < 0.08) return "square";
  return width > height ? "landscape" : "portrait";
}

function semanticTokens(values) {
  const normalized = values.join(" ").normalize("NFKC").toLocaleLowerCase("zh-CN");
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

function tokenHash(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function semanticVector(values, dimensions = 18) {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of semanticTokens(values)) {
    const hash = tokenHash(token);
    vector[hash % dimensions] += (hash & 1) === 0 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(5)));
}

async function analyzeImage(src, focalPoint, descriptors) {
  const absolute = join(root, "public", src.replace(/^\//, ""));
  const { data, info } = await sharp(absolute)
    .resize(16, 16, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luminances = [];
  let saturation = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index] / 255;
    const green = data[index + 1] / 255;
    const blue = data[index + 2] / 255;
    luminances.push(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    saturation += Math.max(red, green, blue) - Math.min(red, green, blue);
  }
  const luminance = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  const contrast = Math.sqrt(luminances.reduce((sum, value) => sum + (value - luminance) ** 2, 0) / luminances.length);
  const hashPixels = [];
  const hashData = await sharp(absolute).resize(8, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  const hashAverage = [...hashData].reduce((sum, value) => sum + value, 0) / hashData.length;
  for (let index = 0; index < hashData.length; index += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit += 1) nibble |= (hashData[index + bit] >= hashAverage ? 1 : 0) << (3 - bit);
    hashPixels.push(nibble.toString(16));
  }
  const composition = [
    focalPoint.x < 0.4 ? "left-weighted" : focalPoint.x > 0.6 ? "right-weighted" : "centered",
    focalPoint.y < 0.42 ? "high-focus" : focalPoint.y > 0.62 ? "low-focus" : "mid-focus",
    luminance > 0.68 ? "bright" : luminance < 0.35 ? "dark" : "balanced-light",
    contrast > 0.24 ? "high-contrast" : "soft-contrast",
  ];
  const searchText = unique([...descriptors, ...composition]).join(" ");
  return {
    luminance: Number(luminance.toFixed(4)),
    contrast: Number(contrast.toFixed(4)),
    saturation: Number((saturation / luminances.length).toFixed(4)),
    perceptualHash: hashPixels.join(""),
    composition,
    semanticVector: semanticVector([...descriptors, ...composition]),
    searchText,
  };
}

async function resolveSourceAsset(src) {
  const collection = src.match(/^\/images\/([^/]+)\//)?.[1];
  if (!collection) return undefined;
  const baseName = basename(src, extname(src));
  for (const sourceName of [baseName, baseName.replace(/-detail$/, "")]) {
    const candidate = join(root, "source-assets", collection, "raw", `${sourceName}.png`);
    try {
      await access(candidate);
      return relative(root, candidate).replaceAll("\\", "/");
    } catch {
      // Continue to the derived source fallback.
    }
  }
  return undefined;
}

const assetsBySource = new Map();
for (const project of archiveManifest.projects) {
  for (const media of project.media) {
    const existing = assetsBySource.get(media.src);
    if (existing && (existing.width !== media.width || existing.height !== media.height)) {
      throw new Error(`Visual asset ${media.src} has conflicting dimensions`);
    }
    const directory = dirname(media.src).replaceAll("\\", "/");
    const avifName = basename(media.src).replace(/\.webp$/i, ".avif");
    const descriptors = unique([
      project.chapter,
      project.place,
      project.season,
      ...project.moods,
      ...project.palette,
      ...project.techniques,
      ...project.mediums,
      ...project.keywords,
      project.title,
      project.subtitle,
      project.summary,
      project.statement,
    ]);
    if (existing) {
      existing.projectIds.push(project.id);
      existing.palette = unique([...existing.palette, ...project.palette]);
      existing.descriptors = unique([...existing.descriptors, ...descriptors]);
      continue;
    }
    const focalPoint = media.focalPoint ?? { x: 0.5, y: 0.5 };
    assetsBySource.set(media.src, {
      id: stableAssetId(media.src),
      src: media.src,
      avif: media.avif,
      responsive: {
        width640: media.responsive.width640,
        width960: media.responsive.width960,
        width640Avif: `${directory}/640/${avifName}`,
        width960Avif: `${directory}/960/${avifName}`,
      },
      alt: media.alt,
      note: media.note,
      width: media.width,
      height: media.height,
      aspectRatio: media.aspectRatio,
      orientation: orientation(media.width, media.height),
      dominantColor: media.dominantColor,
      colorVector: colorVector(media.dominantColor),
      focalPoint,
      palette: unique(project.palette),
      descriptors,
      analysis: await analyzeImage(media.src, focalPoint, descriptors),
      projectIds: [project.id],
      storyLinks: [],
      provenance: {
        kind: "generated-concept",
        sourceAsset: await resolveSourceAsset(media.src),
        usage: "personal-practice",
      },
    });
  }
}

const storyDirectories = (await readdir(storySourcePath, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "en"));
const projectById = new Map(archiveManifest.projects.map((project) => [project.id, project]));

for (const directory of storyDirectories) {
  const story = JSON.parse(await readFile(join(storySourcePath, directory, "story.json"), "utf8"));
  for (const chapter of story.chapters) {
    for (const reference of chapter.media) {
      const media = projectById.get(reference.projectId)?.media?.[reference.mediaIndex];
      const asset = media ? assetsBySource.get(media.src) : undefined;
      if (!asset) throw new Error(`Story ${story.id}/${chapter.id} references a missing visual asset`);
      if (!asset.storyLinks.some((link) => link.id === story.id && link.chapterId === chapter.id)) {
        asset.storyLinks.push({ id: story.id, chapterId: chapter.id });
      }
    }
  }
}

const assets = [...assetsBySource.values()]
  .map((asset) => ({
    ...asset,
    projectIds: unique(asset.projectIds).sort(),
    storyLinks: asset.storyLinks.sort((left, right) => `${left.id}/${left.chapterId}`.localeCompare(`${right.id}/${right.chapterId}`, "en")),
  }))
  .sort((left, right) => left.id.localeCompare(right.id, "en"));
const ids = new Set();
for (const asset of assets) {
  if (ids.has(asset.id)) throw new Error(`Duplicate visual asset id: ${asset.id}`);
  ids.add(asset.id);
}

const manifest = {
  schemaVersion: 2,
  generatedFrom: [
    "content/archive/projects/*/project.json",
    "content/stories/*/story.json",
  ],
  stats: {
    assets: assets.length,
    projects: archiveManifest.projects.length,
    stories: storyDirectories.length,
  },
  assets,
};

await writeFile(appOutputPath, `${JSON.stringify(assets, null, 2)}\n`, "utf8");
await writeFile(publicOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Content OS built: ${assets.length} assets across ${manifest.stats.projects} projects and ${manifest.stats.stories} stories.`);
