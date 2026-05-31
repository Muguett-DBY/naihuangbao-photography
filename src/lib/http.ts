export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

export function getApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || !("error" in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : fallback;
}
