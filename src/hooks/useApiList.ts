import { useFetch } from "./useFetch";

/**
 * Simplified data-fetching hook for list pages.
 * Wraps useFetch and returns the typed list + loading/error/retry/empty states.
 *
 * Usage:
 *   const { items, loading, error, retry, empty } = useApiList<Course[]>("/api/courses", "courses");
 */
export function useApiList<T>(url: string, key: string) {
  const { data, loading, error, retry } = useFetch<Record<string, T[]>>(url);

  const items = data?.[key] ?? [];

  return {
    items,
    loading,
    error,
    retry,
    empty: !loading && !error && items.length === 0,
  };
}
