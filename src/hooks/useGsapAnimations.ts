import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapAnimations() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ── Hero floating glow orbs ──
    const glowOrbs = document.querySelectorAll<HTMLElement>(".hero-glow-orb");
    if (glowOrbs.length) {
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
    }

    // ── Hero title clip reveal ──
    const title = document.querySelector<HTMLElement>(".hero-magazine-title");
    const subtitle = document.querySelector<HTMLElement>(".hero-magazine-subtitle");
    const intro = document.querySelector<HTMLElement>(".hero-cover-intro");
    const badge = document.querySelector<HTMLElement>(".hero-vol-badge");
    const trustTags = document.querySelectorAll<HTMLElement>(".hero-trust-tag");
    const ctaGroup = document.querySelectorAll<HTMLElement>(".hero-cover-cta-group > *");
    const scrollCue = document.querySelector<HTMLElement>(".hero-scroll-indicator");

    const heroTimeline = gsap.timeline({ delay: 0.3 });

    if (badge) {
      heroTimeline.fromTo(
        badge,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      );
    }

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

    if (trustTags.length) {
      heroTimeline.fromTo(
        trustTags,
        { opacity: 0, y: 12, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)", stagger: 0.08 },
        "-=0.2",
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

    if (scrollCue) {
      heroTimeline.fromTo(
        scrollCue,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "-=0.2",
      );
    }

    // ── Scroll Parallax: Hero ──
    const hero = document.querySelector<HTMLElement>(".hero");
    const heroContent = document.querySelector<HTMLElement>(".hero-cover-content");

    if (hero && heroContent) {
      gsap.to(heroContent, {
        y: () => window.innerHeight * 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }

    // ── Cards Parallax: Package / Why / Service cards ──
    const cardSections = document.querySelectorAll<HTMLElement>(
      ".section-shell:not(.hero)",
    );

    cardSections.forEach((section) => {
      const cards = section.querySelectorAll<HTMLElement>(
        ".package-card, .why-card, .service-detail-card",
      );
      if (cards.length) {
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
      }
    });

    // ── Magnetic Buttons ──
    const magneticBtns = document.querySelectorAll<HTMLElement>(
      ".hero-cover-primary-btn, .hero-cover-secondary-btn, .nav-cta, .booking-cta, .package-cta",
    );

    magneticBtns.forEach((btn) => {
      btn.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
          x: x * 0.25,
          y: y * 0.25,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.45,
          ease: "elastic.out(1, 0.35)",
        });
      });
    });

    // ── 3D Card Tilt ──
    const tiltCards = document.querySelectorAll<HTMLElement>(
      ".package-card, .why-card, .service-detail-card",
    );

    tiltCards.forEach((card) => {
      card.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 8,
          rotateX: y * -6,
          transformPerspective: 800,
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto",
        });
      });

      card.addEventListener("mouseleave", () => {
        gsap.to(card, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
        });
      });
    });

    // ── Refresh ScrollTrigger on load ──
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);
}
