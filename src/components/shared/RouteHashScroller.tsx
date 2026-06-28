import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteHashScroller() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const targetId = decodeURIComponent(hash.slice(1));
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      target.scrollIntoView({ behavior, block: "start" });
      return true;
    };

    if (scrollToTarget()) return;

    const root = document.getElementById("main-content") ?? document.body;
    const observer = new MutationObserver(() => {
      if (scrollToTarget()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 4_000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [hash, pathname]);

  return null;
}
