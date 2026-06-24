import { useState, useCallback, useEffect } from "react";

type UserPreferences = {
  theme: "light" | "dark" | "system";
  language: string;
  favorites: string[];
  galleryView: "masonry" | "compact";
  sortMode: "default" | "newest" | "featured";
};

const STORAGE_KEY = "nhb-user-preferences";

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch {}
    return getDefaultPreferences();
  });

  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  const updateTheme = useCallback((theme: UserPreferences["theme"]) => {
    setPreferences((prev) => ({ ...prev, theme }));
  }, []);

  const updateLanguage = useCallback((language: string) => {
    setPreferences((prev) => ({ ...prev, language }));
  }, []);

  const addFavorite = useCallback((photoId: string) => {
    setPreferences((prev) => ({
      ...prev,
      favorites: [...new Set([...prev.favorites, photoId])],
    }));
  }, []);

  const removeFavorite = useCallback((photoId: string) => {
    setPreferences((prev) => ({
      ...prev,
      favorites: prev.favorites.filter((id) => id !== photoId),
    }));
  }, []);

  const updateGalleryView = useCallback((view: UserPreferences["galleryView"]) => {
    setPreferences((prev) => ({ ...prev, galleryView: view }));
  }, []);

  const updateSortMode = useCallback((mode: UserPreferences["sortMode"]) => {
    setPreferences((prev) => ({ ...prev, sortMode: mode }));
  }, []);

  return {
    preferences,
    syncing,
    lastSynced,
    updateTheme,
    updateLanguage,
    addFavorite,
    removeFavorite,
    updateGalleryView,
    updateSortMode,
  };
}

function getDefaultPreferences(): UserPreferences {
  return {
    theme: "system",
    language: "zh-CN",
    favorites: [],
    galleryView: "masonry",
    sortMode: "default",
  };
}
