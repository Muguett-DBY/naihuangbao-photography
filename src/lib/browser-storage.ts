function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return getLocalStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): boolean {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};
