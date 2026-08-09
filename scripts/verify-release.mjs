const args = new Map(process.argv.slice(2).map((value, index, values) => value.startsWith("--") ? [value.slice(2), values[index + 1]] : null).filter(Boolean));
const origin = (args.get("origin") || "https://shoot.custard.top").replace(/\/$/, "");
const canonicalOrigin = (args.get("canonical-origin") || "https://shoot.custard.top").replace(/\/$/, "");
const expectedCommit = args.get("commit");
const cacheBust = Date.now();

async function request(path, options = {}) {
  const separator = path.includes("?") ? "&" : "?";
  let response;
  try {
    response = await fetch(`${origin}${path}${separator}acceptance=${cacheBust}`, {
      redirect: options.redirect ?? "follow",
      headers: { "Cache-Control": "no-cache", Accept: options.accept ?? "text/html,application/json" },
      signal: AbortSignal.timeout(options.timeout ?? 20_000),
    });
  } catch (error) {
    throw new Error(`${path} request failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  if (response.status !== (options.status ?? 200)) throw new Error(`${path} returned ${response.status}`);
  return response;
}

const release = await (await request("/release.json", { accept: "application/json" })).json();
const routes = await (await request("/route-contract.json", { accept: "application/json" })).json();
const archive = await (await request("/archive-manifest.json", { accept: "application/json" })).json();
const stories = await (await request("/story-manifest.json", { accept: "application/json" })).json();
const assets = await (await request("/visual-asset-manifest.json", { accept: "application/json" })).json();

if (expectedCommit && !String(release.commit).startsWith(expectedCommit)) {
  throw new Error(`Release commit mismatch: ${release.commit} does not start with ${expectedCommit}`);
}
if (release.routeSchemaVersion !== routes.schemaVersion) throw new Error("Release route schema mismatch");
if (release.stats?.archiveProjects !== archive.projects.length) throw new Error("Release archive count mismatch");
if (release.stats?.stories !== stories.stories.length) throw new Error("Release story count mismatch");
if (assets.stats?.assets < 38) throw new Error(`Visual asset manifest is incomplete: ${assets.stats?.assets}`);

const archiveRoute = `/archive/${archive.projects[0].id}`;
const storyRoute = `/stories/${stories.stories[0].id}`;
const criticalPaths = ["/", "/archive", archiveRoute, "/stories", storyRoute, "/create", "/create/story", "/studio", "/editor", "/practice"];
for (const path of criticalPaths) {
  const html = await (await request(path)).text();
  if (!html.includes('id="root"')) throw new Error(`${path} is missing the app root`);
  if ((path === archiveRoute || path === storyRoute) && (!html.includes("application/ld+json") || !html.includes(`${canonicalOrigin}${path}`))) {
    throw new Error(`${path} is missing route-specific static SEO metadata`);
  }
}

const leadAsset = assets.assets.find((asset) => asset.src.includes("visual-os-v6"));
if (!leadAsset) throw new Error("Visual OS V6 asset missing from manifest");
await request(leadAsset.responsive.width640Avif, { accept: "image/avif" });

console.log(`Release accepted at ${origin}: ${criticalPaths.length} routes, ${routes.routes.length} route contracts, ${archive.projects.length} archive projects, ${stories.stories.length} stories, ${assets.stats.assets} assets, commit ${String(release.commit).slice(0, 12)}.`);
