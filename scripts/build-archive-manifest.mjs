import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = join(root, "content", "archive", "projects");
const outputPath = join(root, "public", "archive-manifest.json");
const generatedPath = join(root, "src", "data", "archive-projects.generated.json");
const projectDirectories = (await readdir(sourcePath, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "en"));
const projects = await Promise.all(projectDirectories.map(async (directory) => {
  const project = JSON.parse(await readFile(join(sourcePath, directory, "project.json"), "utf8"));
  if (project.id !== directory) throw new Error(`Archive folder ${directory} must match project id ${project.id}`);
  return project;
}));

if (!Array.isArray(projects) || projects.length === 0) {
  throw new Error("Archive projects must be a non-empty array");
}

const ids = new Set();
const manifestProjects = [];

for (const project of projects) {
  if (!project.id || ids.has(project.id)) throw new Error(`Duplicate or missing archive id: ${project.id}`);
  if (project.kind !== "concept") throw new Error(`Archive project ${project.id} must be explicitly marked concept`);
  if (!Array.isArray(project.media) || project.media.length === 0) throw new Error(`Archive project ${project.id} has no media`);
  if (!project.statement || !Array.isArray(project.process) || project.process.length < 2) {
    throw new Error(`Archive project ${project.id} needs a statement and at least two process notes`);
  }
  if (!Array.isArray(project.techniques) || project.techniques.length === 0) {
    throw new Error(`Archive project ${project.id} needs at least one technique`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(project.publishedAt)) {
    throw new Error(`Archive project ${project.id} needs a YYYY-MM-DD publishedAt date`);
  }
  if (!Array.isArray(project.mediums) || project.mediums.length === 0) {
    throw new Error(`Archive project ${project.id} needs at least one medium`);
  }
  if (!Array.isArray(project.keywords) || project.keywords.length < 3) {
    throw new Error(`Archive project ${project.id} needs at least three search keywords`);
  }
  if (!Array.isArray(project.related)) throw new Error(`Archive project ${project.id} needs related project ids`);
  ids.add(project.id);

  const media = [];
  for (const item of project.media) {
    const source = item.src.replace(/^\//, "");
    const absolute = join(root, "public", source);
    if (extname(absolute).toLowerCase() !== ".webp") throw new Error(`Archive source must be WebP: ${item.src}`);
    await stat(absolute);
    const metadata = await sharp(absolute).metadata();
    if (metadata.width !== item.width || metadata.height !== item.height) {
      throw new Error(`Dimension mismatch for ${item.src}: expected ${item.width}x${item.height}, got ${metadata.width}x${metadata.height}`);
    }

    const directory = dirname(source).replaceAll("\\", "/");
    const fileName = basename(source);
    const avifName = fileName.replace(/\.webp$/i, ".avif");
    const variants = {
      avif: `/${directory}/${avifName}`,
      responsive: {
        width640: `/${directory}/640/${fileName}`,
        width960: `/${directory}/960/${fileName}`,
      },
    };
    const required = [
      variants.avif,
      variants.responsive.width640,
      variants.responsive.width960,
      `/${directory}/640/${avifName}`,
      `/${directory}/960/${avifName}`,
    ];
    await Promise.all(required.map((path) => stat(join(root, "public", path.replace(/^\//, "")))));
    const { data, info } = await sharp(absolute)
      .resize({ width: 12, height: 12, fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let red = 0;
    let green = 0;
    let blue = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
    }
    const pixels = data.length / info.channels;
    const dominantColor = `#${[red, green, blue]
      .map((channel) => Math.round(channel / pixels).toString(16).padStart(2, "0"))
      .join("")}`;
    const blurBuffer = await sharp(absolute).resize({ width: 24 }).webp({ quality: 28 }).toBuffer();
    media.push({
      ...item,
      dominantColor,
      blurDataUrl: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
      aspectRatio: Number((item.width / item.height).toFixed(4)),
      ...variants,
    });
  }
  manifestProjects.push({ ...project, media });
}

for (const project of manifestProjects) {
  for (const relatedId of project.related) {
    if (!ids.has(relatedId) || relatedId === project.id) {
      throw new Error(`Archive project ${project.id} has invalid related id: ${relatedId}`);
    }
  }
}

const manifest = {
  schemaVersion: 3,
  generatedFrom: `${relative(root, sourcePath).replaceAll("\\", "/")}/*/project.json`,
  projects: manifestProjects,
};

const appProjects = manifestProjects.map((project) => ({
  ...project,
  media: project.media.map(({ blurDataUrl: _blurDataUrl, avif: _avif, responsive: _responsive, ...media }) => media),
}));

await writeFile(generatedPath, `${JSON.stringify(appProjects, null, 2)}\n`, "utf8");
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Archive manifest built: ${manifestProjects.length} projects, ${manifestProjects.reduce((sum, project) => sum + project.media.length, 0)} media items.`);
