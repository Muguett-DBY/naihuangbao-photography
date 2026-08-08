import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = join(root, "content", "archive", "projects.json");
const outputPath = join(root, "public", "archive-manifest.json");
const projects = JSON.parse(await readFile(sourcePath, "utf8"));

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
    media.push({ ...item, ...variants });
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
  schemaVersion: 2,
  generatedFrom: relative(root, sourcePath).replaceAll("\\", "/"),
  projects: manifestProjects,
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Archive manifest built: ${manifestProjects.length} projects, ${manifestProjects.reduce((sum, project) => sum + project.media.length, 0)} media items.`);
