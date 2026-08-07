import { useEffect, useRef, useState } from "react";

interface DeferredRenderOptions {
  rootMargin?: string;
}

export function useDeferredRender<T extends HTMLElement = HTMLDivElement>({
  rootMargin = "640px 0px",
}: DeferredRenderOptions = {}) {
  const ref = useRef<T>(null);
  const [ready, setReady] = useState(() => (
    typeof window === "undefined" || !("IntersectionObserver" in window)
  ));

  useEffect(() => {
    if (ready) return;
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin, threshold: 0.01 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return { ref, ready };
}
