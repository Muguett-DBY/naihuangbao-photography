import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const distPath = resolve(process.cwd(), "dist");
const indexPath = resolve(distPath, "index.html");
const notFoundPath = resolve(distPath, "404.html");

await copyFile(indexPath, notFoundPath);
console.log("Wrote dist/404.html from dist/index.html.");
