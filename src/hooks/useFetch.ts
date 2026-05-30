import { useEffect, useRef, useState, useCallback } from "react";

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useFetch<T>(url: string | null, fetchOptions?: RequestInit): FetchState<T> & { retry: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: !!url, error: null });
  const [retryCount, setRetryCount] = useState(0);
  const optionsRef = useRef(fetchOptions);
  optionsRef.current = fetchOptions;

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(url, { signal: ctrl.signal, ...optionsRef.current })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!ctrl.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ data: null, loading: false, error: err.message });
      });

    return () => ctrl.abort();
  }, [url, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { ...state, retry };
}
