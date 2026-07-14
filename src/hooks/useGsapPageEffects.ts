import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapPageEffects(rootRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef?.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const initializedGroups = new WeakSet<HTMLElement>();

    const initializeGroup = (group: HTMLElement) => {
      if (initializedGroups.has(group)) return false;

      const items = group.querySelectorAll<HTMLElement>("[data-motion-item]");
      if (items.length === 0) return false;

      initializedGroups.add(group);
      gsap.from(items, {
        opacity: 0,
        y: 18,
        duration: 0.62,
        stagger: 0.065,
        ease: "power3.out",
        clearProps: "opacity,transform",
        scrollTrigger: {
          trigger: group,
          start: "top 86%",
          once: true,
        },
      });
      return true;
    };

    const scanForGroups = (scope: HTMLElement) => {
      let initialized = false;
      const parentGroup = scope.closest<HTMLElement>("[data-motion-group]");

      if (parentGroup && root.contains(parentGroup)) {
        initialized = initializeGroup(parentGroup) || initialized;
      }
      if (scope.matches("[data-motion-group]")) {
        initialized = initializeGroup(scope) || initialized;
      }
      scope.querySelectorAll<HTMLElement>("[data-motion-group]").forEach((group) => {
        initialized = initializeGroup(group) || initialized;
      });

      return initialized;
    };

    const context = gsap.context(() => {
      scanForGroups(root);
    }, root);

    const observer = new MutationObserver((records) => {
      let initialized = false;

      context.add(() => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            initialized = scanForGroups(node) || initialized;
          });
        });
      });

      if (initialized) ScrollTrigger.refresh();
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      context.revert();
    };
  }, [rootRef]);
}
