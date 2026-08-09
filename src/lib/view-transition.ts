export type ViewTransitionKind = "page" | "photo-deepen" | "photo-return" | "create" | "studio";

type TransitionIntent = {
  from: string;
  to: string;
  kind: ViewTransitionKind;
  startedAt: number;
};

let activeIntent: TransitionIntent | null = null;

function isPhotoDetail(path: string) {
  return /^\/gallery\/[^/]+/.test(path);
}

function isArchiveDetail(path: string) {
  return /^\/archive\/[^/]+/.test(path);
}

export function resolveViewTransitionKind(from: string, to: string): ViewTransitionKind {
  if (isPhotoDetail(to) && (from === "/archive" || from === "/gallery")) return "photo-deepen";
  if (isPhotoDetail(from) && (to === "/archive" || to === "/gallery")) return "photo-return";
  if (isArchiveDetail(to) && from === "/archive") return "photo-deepen";
  if (isArchiveDetail(from) && to === "/archive") return "photo-return";
  if ((from === "/lab" && ["/create", "/studio", "/editor"].includes(to)) || (to === "/create" && from === "/archive")) return "create";
  if (["/create", "/studio"].includes(from) || ["/create", "/studio"].includes(to)) return "studio";
  return "page";
}

export function prepareViewTransition(from: string, to: string) {
  const kind = resolveViewTransitionKind(from, to);
  activeIntent = { from, to, kind, startedAt: performance.now() };
  document.documentElement.dataset.transitionKind = kind;
}

export function finishViewTransition(pathname: string) {
  if (!activeIntent || activeIntent.to.split(/[?#]/, 1)[0] !== pathname) return null;
  const metric = { ...activeIntent, duration: Math.round(performance.now() - activeIntent.startedAt) };
  activeIntent = null;
  window.setTimeout(() => delete document.documentElement.dataset.transitionKind, 700);
  return metric;
}

export function visualAssetTransitionName(assetId: string) {
  return `visual-asset-${assetId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
}
