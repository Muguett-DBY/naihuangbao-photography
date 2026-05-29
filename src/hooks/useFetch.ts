import { useEffect, useRef, useState } from "react";

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useFetch<T>(url: string | null, fetchOptions?: RequestInit): FetchState<T> & { retry: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: !!url, error: null });
  const retryCount = useRef(0);

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(url, { signal: ctrl.signal, ...fetchOptions })
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
  }, [url, retryCount.current]);

  const retry = () => {
    retryCount.current += 1;
    setState((s) => ({ ...s, loading: true, error: null }));
  };

  return { ...state, retry };
}
