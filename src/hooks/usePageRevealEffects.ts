import { useEffect, type RefObject } from "react";

const GROUP_SELECTOR = "[data-motion-group]";
const ITEM_SELECTOR = "[data-motion-item]";

export function usePageRevealEffects(rootRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const initializedGroups = new WeakSet<HTMLElement>();
    const runningAnimations = new Set<Animation>();

    const revealGroup = (group: HTMLElement) => {
      if (initializedGroups.has(group)) return;
      initializedGroups.add(group);
      group.dataset.motionState = "visible";

      if (reduceMotion || typeof group.animate !== "function") return;
      group.querySelectorAll<HTMLElement>(ITEM_SELECTOR).forEach((item, index) => {
        const animation = item.animate([
          { opacity: 0, transform: "translate3d(0, 18px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ], {
          duration: 560,
          delay: Math.min(index, 6) * 54,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        });
        runningAnimations.add(animation);
        animation.addEventListener("finish", () => {
          runningAnimations.delete(animation);
          animation.cancel();
        }, { once: true });
      });
    };

    const observer = typeof IntersectionObserver === "undefined" || reduceMotion
      ? null
      : new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealGroup(entry.target as HTMLElement);
          observer?.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

    const initializeGroup = (group: HTMLElement) => {
      if (initializedGroups.has(group)) return;
      if (reduceMotion || !observer) revealGroup(group);
      else observer.observe(group);
    };

    const scanForGroups = (scope: HTMLElement) => {
      const parentGroup = scope.closest<HTMLElement>(GROUP_SELECTOR);
      if (parentGroup && root.contains(parentGroup)) initializeGroup(parentGroup);
      if (scope.matches(GROUP_SELECTOR)) initializeGroup(scope);
      scope.querySelectorAll<HTMLElement>(GROUP_SELECTOR).forEach(initializeGroup);
    };

    scanForGroups(root);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scanForGroups(node);
        });
      });
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      runningAnimations.forEach((animation) => animation.cancel());
      runningAnimations.clear();
    };
  }, [rootRef]);
}
