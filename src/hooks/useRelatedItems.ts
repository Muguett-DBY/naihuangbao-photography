import { useMemo } from "react";
import { useApiList } from "./useApiList";

/**
 * Hook for fetching related items (excluding the current item) from a list endpoint.
 * Used by PresetDetailPage and ShopDetailPage to show related items.
 *
 * Usage:
 *   const { related, loading } = useRelatedItems<Preset>("/api/presets", "presets", presetId);
 */
export function useRelatedItems<T extends { id: string }>(
  listUrl: string,
  listKey: string,
  currentId: string | undefined,
  limit = 4,
) {
  const { items, loading, error, retry } = useApiList<T>(listUrl, listKey);

  const related = useMemo(
    () => items.filter((item) => item.id !== currentId).slice(0, limit),
    [items, currentId, limit],
  );

  return { related, loading, error, retry };
}
