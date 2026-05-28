import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Page-level GSAP effects — DECORATIVE ONLY.
 * All content is visible by default. Animations enhance but never hide.
 */
export function useGsapPageEffects(rootRef?: RefObject<HTMLElement | null>) {
  const guardRef = useRef(false);

  useEffect(() => {
    // Kill any leftover ScrollTriggers from previous page
    ScrollTrigger.getAll().forEach((t) => t.kill());

    if (guardRef.current) return;
    guardRef.current = true;

    const $ = <T extends Element>(sel: string): T[] => {
      if (rootRef?.current) {
        return Array.from(rootRef.current.querySelectorAll<T>(sel));
      }
      return Array.from(document.querySelectorAll<T>(sel));
    };

    const cleanupFns: (() => void)[] = [];

    const addListener = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
    ) => {
      el.addEventListener(type, handler);
      cleanupFns.push(() => el.removeEventListener(type, handler));
    };

    // ── Floating decor elements ──
    const floatEls = $<HTMLElement>(".float-element");
    floatEls.forEach((el, i) => {
      gsap.to(el, {
        y: i % 2 === 0 ? -18 : 16,
        x: i % 3 === 0 ? 10 : -8,
        duration: 4 + i * 0.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: i * 0.3,
      });
    });

    // ── Hero glow orbs ──
    const glowOrbs = $<HTMLElement>(".hero-glow-orb");
    glowOrbs.forEach((orb, i) => {
      gsap.to(orb, {
        x: i === 0 ? 24 : -18,
        y: i === 0 ? -16 : 14,
        duration: 6 + i * 0.7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });

    // ── Section heading color shift on scroll ──
    const colorShiftEls = $<HTMLElement>(".section-heading h2");
    colorShiftEls.forEach((el) => {
      gsap.to(el, {
        color: "#F5A891",
        duration: 0.35,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: el,
          start: "top 40%",
          end: "bottom top",
          toggleActions: "play reverse play reverse",
        },
      });
    });

    // ── Magnetic buttons ──
    const magneticBtns = $<HTMLElement>(
      ".hero-cover-primary-btn, .hero-cover-secondary-btn, .nav-cta, .booking-cta, .package-cta",
    );
    magneticBtns.forEach((btn) => {
      const moveHandler = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.35, ease: "power2.out", overwrite: "auto" });
      };
      const leaveHandler = () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, 0.35)" });
      };
      addListener(btn, "mousemove", moveHandler);
      addListener(btn, "mouseleave", leaveHandler);
    });

    // ── 3D card tilt ──
    const tiltCards = $<HTMLElement>(".package-card, .why-card, .service-detail-card");
    tiltCards.forEach((card) => {
      const moveHandler = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 8, rotateX: y * -6, transformPerspective: 800,
          duration: 0.5, ease: "power2.out", overwrite: "auto",
        });
      };
      const leaveHandler = () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      };
      addListener(card, "mousemove", moveHandler);
      addListener(card, "mouseleave", leaveHandler);
    });

    ScrollTrigger.refresh();

    return () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
      ScrollTrigger.getAll().forEach((t) => t.kill());
      guardRef.current = false;
    };
  }, [rootRef, guardRef]);
}
