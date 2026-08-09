import { safeLocalStorage } from "./browser-storage";
import type { WorkspaceProject } from "../types/workspace-project";
import type { PublishedProjectDraft, PublishedProjectReceipt, PublishedProjectSnapshot, PublishedProjectVersion, ResolvedPublishedProjectSnapshot } from "../types/published-project";
import { isPublicAssetSource, MAX_PUBLISHED_ASSETS } from "./project-publish-contract";
import { migrateWorkspaceProject } from "./workspace-project-store";

const PUBLICATION_REGISTRY_KEY = "nhb-publication-registry-v1";

type PublicationRegistry = Record<string, PublishedProjectReceipt>;

function readRegistry(): PublicationRegistry {
  try {
    const parsed = JSON.parse(safeLocalStorage.getItem(PUBLICATION_REGISTRY_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry: PublicationRegistry) {
  safeLocalStorage.setItem(PUBLICATION_REGISTRY_KEY, JSON.stringify(registry));
}

function portableProject(project: WorkspaceProject): WorkspaceProject {
  const assets = project.assets.filter((asset) => isPublicAssetSource(asset.src)).slice(0, MAX_PUBLISHED_ASSETS);
  return {
    ...project,
    name: project.name.trim().slice(0, 80) || "Untitled visual project",
    description: project.description.trim().slice(0, 600),
    assets,
    vaultAssetIds: project.vaultAssetIds.filter((id) => assets.some((asset) => asset.assetId === id)),
    coverAssetId: assets.some((asset) => asset.assetId === project.coverAssetId) ? project.coverAssetId : assets[0]?.assetId,
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createPublishedProjectDraft(project: WorkspaceProject): Promise<PublishedProjectDraft> {
  const portable = portableProject(project);
  return { schemaVersion: 1, project: portable, contentHash: await sha256(JSON.stringify(portable)) };
}

export function getLocalPublication(projectId: string) {
  return readRegistry()[projectId] ?? null;
}

export async function publishWorkspaceProject(project: WorkspaceProject): Promise<PublishedProjectReceipt> {
  const draft = await createPublishedProjectDraft(project);
  const current = getLocalPublication(project.id);
  const response = await fetch("/api/projects/publish", {
    method: "POST",
    headers: { "content-type": "application/json", "x-nhb-public-action": "1" },
    body: JSON.stringify({ draft, slug: current?.slug }),
  });
  const body = await response.json().catch(() => ({})) as PublishedProjectReceipt & { error?: string };
  if (!response.ok) throw new Error(body.error || "Project publish failed");
  const registry = readRegistry();
  registry[project.id] = body;
  writeRegistry(registry);
  return body;
}

export async function fetchPublishedProject(slug: string, version?: number): Promise<ResolvedPublishedProjectSnapshot> {
  const suffix = version ? `?version=${version}` : "";
  const response = await fetch(`/api/projects/published/${encodeURIComponent(slug)}${suffix}`);
  const body = await response.json().catch(() => ({})) as PublishedProjectSnapshot & { error?: string };
  if (!response.ok) throw new Error(body.error || "Published project unavailable");
  return { ...body, project: migrateWorkspaceProject(body.project) };
}

export async function listPublishedProjectVersions(slug: string): Promise<PublishedProjectVersion[]> {
  const response = await fetch(`/api/projects/published/${encodeURIComponent(slug)}?versions=1`);
  const body = await response.json().catch(() => ({})) as { versions?: PublishedProjectVersion[]; error?: string };
  if (!response.ok || !Array.isArray(body.versions)) throw new Error(body.error || "Project versions unavailable");
  return body.versions;
}
