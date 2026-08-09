import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { routeContract } from "../src/routing/route-contract";

const publicDirectory = resolve(process.cwd(), "public");
const manifest = {
  schemaVersion: 1,
  source: "src/routing/route-contract.ts",
  routes: routeContract,
};

const redirects = [
  "/admin /admin/ 301",
  "/admin/ / 200",
  "/admin/:path / 200",
];

for (const route of routeContract) {
  if (route.scope === "admin" || route.path === "/") continue;
  if ("edgeRedirect" in route && route.edgeRedirect) {
    redirects.push(`${route.path} ${route.edgeRedirect} 302`);
    continue;
  }
  if ("staticShell" in route && route.staticShell && "dynamic" in route && route.dynamic) continue;
  redirects.push(`${route.path} / 200`);
  if (!("dynamic" in route && route.dynamic) && !route.path.endsWith("/")) redirects.push(`${route.path}/ / 200`);
}

await Promise.all([
  writeFile(resolve(publicDirectory, "route-contract.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  writeFile(resolve(publicDirectory, "_redirects"), `${redirects.join("\n")}\n`, "utf8"),
]);
console.log(`Route contract built: ${routeContract.length} routes, ${redirects.length} edge rules.`);
