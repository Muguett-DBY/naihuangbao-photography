import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const sourcePath = join(root, "content", "stories");
const archivePath = join(root, "src", "data", "archive-projects.generated.json");
const generatedPath = join(root, "src", "data", "visual-stories.generated.json");
const publicPath = join(root, "public", "story-manifest.json");
const archiveProjects = JSON.parse(await readFile(archivePath, "utf8"));
const archiveById = new Map(archiveProjects.map((project) => [project.id, project]));
const storyDirectories = (await readdir(sourcePath, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "en"));
const ids = new Set();
const stories = [];

for (const directory of storyDirectories) {
  const story = JSON.parse(await readFile(join(sourcePath, directory, "story.json"), "utf8"));
  if (!story.id || story.id !== directory || ids.has(story.id)) {
    throw new Error(`Story folder ${directory} must contain a unique matching id`);
  }
  if (story.concept !== true || !/^#[0-9a-f]{6}$/i.test(story.accent)) {
    throw new Error(`Story ${story.id} must be marked concept and define a hex accent`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(story.publishedAt) || story.readingMinutes < 1) {
    throw new Error(`Story ${story.id} needs a publication date and reading time`);
  }
  if (!Array.isArray(story.chapters) || story.chapters.length < 3) {
    throw new Error(`Story ${story.id} needs at least three chapters`);
  }

  const chapterIds = new Set();
  const chapters = [];
  for (const chapter of story.chapters) {
    if (!chapter.id || chapterIds.has(chapter.id) || !["full", "columns", "contact", "quiet"].includes(chapter.layout)) {
      throw new Error(`Story ${story.id} has an invalid chapter id or layout`);
    }
    if (!chapter.title || !chapter.body || !Array.isArray(chapter.media) || chapter.media.length === 0) {
      throw new Error(`Story ${story.id}/${chapter.id} needs copy and media`);
    }
    chapterIds.add(chapter.id);
    const media = chapter.media.map((reference) => {
      const project = archiveById.get(reference.projectId);
      const item = project?.media?.[reference.mediaIndex];
      if (!item) throw new Error(`Story ${story.id}/${chapter.id} has an invalid archive media reference`);
      return {
        src: item.src,
        alt: item.alt,
        width: item.width,
        height: item.height,
        note: item.note,
        dominantColor: item.dominantColor,
        aspectRatio: item.aspectRatio,
      };
    });
    await Promise.all(media.map((item) => stat(join(root, "public", item.src.replace(/^\//, "")))));
    chapters.push({ ...chapter, media });
  }
  ids.add(story.id);
  stories.push({ ...story, chapters });
}

stories.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
const manifest = {
  schemaVersion: 1,
  generatedFrom: `${relative(root, sourcePath).replaceAll("\\", "/")}/*/story.json`,
  stories,
};
await writeFile(generatedPath, `${JSON.stringify(stories, null, 2)}\n`, "utf8");
await writeFile(publicPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Story manifest built: ${stories.length} stories, ${stories.reduce((sum, story) => sum + story.chapters.length, 0)} chapters.`);
