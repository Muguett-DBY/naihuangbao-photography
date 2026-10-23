import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LAW_GRAPHICS } from "../src/data/law/graphics";

const previews = LAW_GRAPHICS.map(({ lessonId, subject, title, kind, intro }) => ({ lessonId, subject, title, kind, intro }));
const output = fileURLToPath(new URL("../src/data/law/graphics-preview.generated.json", import.meta.url));
await writeFile(output, `${JSON.stringify(previews, null, 2)}\n`, "utf8");
console.log(`Generated ${previews.length} graphic previews without animation payloads.`);
