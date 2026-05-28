import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapPageEffects(rootRef?: RefObject<HTMLElement | null>) {
  const guardRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

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

    const $1 = <T extends Element>(sel: string): T | null => {
      if (rootRef?.current) {
        return rootRef.current.querySelector<T>(sel);
      }
      return document.querySelector<T>(sel);
    };

    // Scroll progress bar
    const progressBar = $1<HTMLElement>(".scroll-progress-bar");
    if (progressBar) {
      gsap.to(progressBar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });
    }

    // Floating decor elements
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

    // Hero glow orbs
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

    // Hero title clip reveal
    const title = $1<HTMLElement>(".hero-magazine-title");
    const subtitle = $1<HTMLElement>(".hero-magazine-subtitle");
    const intro = $1<HTMLElement>(".hero-cover-intro");
    const ctaGroup = $<HTMLElement>(".hero-cover-cta-group > *");

    const heroTimeline = gsap.timeline({ delay: 0.3 });

    if (title) {
      heroTimeline.fromTo(
        title,
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.out" },
        "-=0.2",
      );
    }

    if (subtitle) {
      heroTimeline.fromTo(
        subtitle,
        { opacity: 0, x: -20, clipPath: "inset(0 100% 0 0)" },
        { opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)", duration: 0.65, ease: "power2.out" },
        "-=0.5",
      );
    }

    if (intro) {
      heroTimeline.fromTo(
        intro,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3",
      );
    }

    if (ctaGroup.length) {
      heroTimeline.fromTo(
        ctaGroup,
        { opacity: 0, y: 14, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.7)", stagger: 0.1 },
        "-=0.1",
      );
    }

    // Section heading color shift
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

    // Cards scroll-reveal
    const cardSections = $<HTMLElement>(".section-shell:not(.hero)");
    cardSections.forEach((section) => {
      const cards = section.querySelectorAll<HTMLElement>(
        ".package-card, .why-card, .service-detail-card, .course-card, .preset-card, .workshop-card, .merchandise-card, .home-service-card",
      );
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40, scale: 0.96, rotateX: i % 2 === 0 ? 4 : -4 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    });

    // Magnetic buttons
    const magneticBtns = $<HTMLElement>(
      ".hero-cover-primary-btn, .hero-cover-secondary-btn, .nav-cta, .booking-cta, .package-cta",
    );
    magneticBtns.forEach((btn) => {
      btn.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.35, ease: "power2.out", overwrite: "auto" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, 0.35)" });
      });
    });

    // 3D card tilt
    const tiltCards = $<HTMLElement>(
      ".package-card, .why-card, .service-detail-card",
    );
    tiltCards.forEach((card) => {
      card.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 8, rotateX: y * -6, transformPerspective: 800,
          duration: 0.5, ease: "power2.out", overwrite: "auto",
        });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });

    // Price countdown
    const priceEls = $<HTMLElement>('[data-count-format="price"]');
    priceEls.forEach((el) => {
      const rawTarget = el.getAttribute("data-count-target");
      const prefix = el.getAttribute("data-count-prefix") || "¥";
      const suffix = el.getAttribute("data-count-suffix") || "";
      const targetVal = parseFloat(rawTarget || "0");
      if (!targetVal) return;

      const multiplier = targetVal < 100 ? 3 : 1.8;
      let startVal = Math.ceil((targetVal * multiplier) / 100) * 100;
      if (startVal - targetVal < 100) {
        startVal = Math.ceil((targetVal + 200) / 100) * 100;
      }

      const card = el.closest(".package-card") || el.parentElement;
      el.textContent = `${prefix}${startVal}${suffix}`;

      const proxy = { val: startVal };
      gsap.fromTo(
        proxy,
        { val: startVal },
        {
          val: targetVal,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 70%",
            end: "top 15%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            el.textContent = `${prefix}${Math.round(proxy.val)}${suffix}`;
          },
          onComplete: () => {
            el.textContent = `${prefix}${targetVal}${suffix}`;
            gsap.timeline()
              .to(el, { scale: 1.18, duration: 0.2, ease: "power2.out" })
              .to(el, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" });
          },
        },
      );
    });

    ScrollTrigger.refresh();

    cleanupRef.current = () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      guardRef.current = false;
    };

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      guardRef.current = false;
    };
  }, [rootRef, guardRef]);
}
