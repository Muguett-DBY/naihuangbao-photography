import { useEffect, useRef } from "react";

type RevealOptions = {
  threshold?: number;
  once?: boolean;
  rootMargin?: string;
  delay?: number;
  distance?: number;
};

export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  once = true,
  rootMargin = "0px 0px -10% 0px",
  delay = 0,
  distance = 24,
}: RevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      el.classList.add("is-revealed");
      return undefined;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-revealed");
      return undefined;
    }
    el.style.setProperty("--reveal-distance", `${distance}px`);
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    el.classList.add("reveal-on-scroll");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-revealed");
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            (entry.target as HTMLElement).classList.remove("is-revealed");
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin, delay, distance]);

  return ref;
}
