const EVENT_NAME = "nhb:creative-work-state";
const dirtyScopes = new Set<string>();

export function setCreativeWorkDirty(scope: string, dirty: boolean) {
  if (dirty) dirtyScopes.add(scope);
  else dirtyScopes.delete(scope);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.creativeDirty = dirtyScopes.size ? "true" : "false";
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { dirty: dirtyScopes.size > 0 } }));
  }
}

export function hasUnsavedCreativeWork() {
  return dirtyScopes.size > 0;
}

export function subscribeCreativeWorkState(listener: (dirty: boolean) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<{ dirty: boolean }>).detail.dirty);
  window.addEventListener(EVENT_NAME, handle);
  return () => window.removeEventListener(EVENT_NAME, handle);
}
