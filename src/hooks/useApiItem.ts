import { useFetch } from "./useFetch";

/**
 * Simplified data-fetching hook for detail pages.
 * Wraps useFetch and returns the typed item + loading/error/retry states.
 * Automatically extracts the first value from the API response object.
 *
 * Usage:
 *   const { item, loading, error, retry } = useApiItem<Workshop>("/api/workshops/123");
 */
export function useApiItem<T>(url: string | null) {
  const { data, loading, error, retry } = useFetch<Record<string, T>>(url);

  // Extract the first value from the response object (e.g., { workshop: ... } -> ...)
  const item = data ? (Object.values(data)[0] as T | undefined) ?? null : null;

  return {
    item,
    loading,
    error,
    retry,
  };
}
