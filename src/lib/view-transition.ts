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

export function resolveViewTransitionKind(from: string, to: string): ViewTransitionKind {
  if (isPhotoDetail(to) && (from === "/archive" || from === "/gallery")) return "photo-deepen";
  if (isPhotoDetail(from) && (to === "/archive" || to === "/gallery")) return "photo-return";
  if ((from === "/lab" && ["/studio", "/editor"].includes(to)) || (to === "/studio" && from === "/archive")) return "create";
  if (from === "/studio" || to === "/studio") return "studio";
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
