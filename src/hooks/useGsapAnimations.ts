import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ── Text morph phrases ── */
const morphPhrases = [
  "南京女生写真与情侣约拍",
  "把日常拍成可以反复翻看的记忆",
  "柔和·胶片感·尊重隐私",
  "约拍南京 · 公园 / 街拍 / 室内",
];

export function useGsapAnimations(rootRef?: RefObject<HTMLElement | null>) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

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

    /* ══════════════════════════════════════════
       EFFECT 1: 滚动进度条 (Scroll Progress Bar)
       ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       EFFECT 2: 浮动飘浮元素 (Floating decor)
       ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       EFFECT 3: Hero 浮动光晕 (existing)
       ══════════════════════════════════════════ */
    const glowOrbs = $<HTMLElement>(".hero-glow-orb");
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

    /* ══════════════════════════════════════════
       EFFECT 4: Hero title clip reveal (existing)
       ══════════════════════════════════════════ */
    const title = $1<HTMLElement>(".hero-magazine-title");
    const subtitle = $1<HTMLElement>(".hero-magazine-subtitle");
    const intro = $1<HTMLElement>(".hero-cover-intro");
    const badge = $1<HTMLElement>(".hero-vol-badge");
    const trustTags = $<HTMLElement>(".hero-trust-tag");
    const ctaGroup = $<HTMLElement>(".hero-cover-cta-group > *");
    const scrollCue = $1<HTMLElement>(".hero-scroll-indicator");

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

    /* ══════════════════════════════════════════
       EFFECT 5: Text Morph (文字轮换)
       ══════════════════════════════════════════ */
    const morphEl = $1<HTMLElement>(".hero-magazine-subtitle");
    if (morphEl) {
      let morphIndex = 0;
      const morphTimeline = gsap.timeline({ repeat: -1, delay: 3.5 });

      morphPhrases.forEach((phrase, i) => {
        if (i === 0) return; // skip first — already shown in reveal

        morphTimeline
          .to(morphEl, {
            opacity: 0,
            y: -6,
            filter: "blur(3px)",
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
              morphEl.textContent = phrase;
            },
          })
          .to(morphEl, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.45,
            ease: "power2.out",
          })
          .to(morphEl, {
            duration: 3.2,
            ease: "none",
            onComplete: () => {
              morphIndex = (i + 1) % morphPhrases.length;
            },
          });
      });
    }

    /* ══════════════════════════════════════════
       EFFECT 6: 平滑锚点滚动 (Smooth Scroll)
       ══════════════════════════════════════════ */
    $<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e: MouseEvent) => {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        gsap.to(window, {
          scrollTo: { y: target, offsetY: 64 },
          duration: 1.0,
          ease: "power3.inOut",
        });
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 7: 数字计数器 (Count-Up)
       ══════════════════════════════════════════ */
    $<HTMLElement>("[data-count-target]").forEach((el) => {
      const target = parseFloat(el.getAttribute("data-count-target") || "0");
      const suffix = el.getAttribute("data-count-suffix") || "";
      const prefix = el.getAttribute("data-count-prefix") || "";
      // Start from mock high price for dramatic count-down (psychological pricing)
      const startVal = Math.max(target * 18, 180);
      el.textContent = prefix + Math.round(startVal) + suffix;

      const counter = { val: startVal };
      gsap.to(counter, {
        val: target,
        duration: 1.8,
        ease: "expo.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
        onUpdate: () => {
          el.textContent = prefix + Math.round(counter.val) + suffix;
        },
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 8: 无限水平滚动图库 (Auto-Scroll Gallery)
       ══════════════════════════════════════════ */
    const galleryTracks = $<HTMLElement>(".gallery-auto-scroll");
    galleryTracks.forEach((track) => {
      const speed = parseFloat(track.getAttribute("data-scroll-speed") || "0.25");
      let xPos = 0;
      let rafId = 0;
      let isVisible = true;

      // Clone children for seamless loop
      const children = Array.from(track.children);
      children.forEach((child) => {
        const clone = child.cloneNode(true) as HTMLElement;
        track.appendChild(clone);
      });

      // Pause RAF when offscreen
      const io = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
      });
      io.observe(track);
      (track as any)._autoScrollIO = io;

      const scrollFn = () => {
        if (isVisible && !track.matches(":hover")) {
          xPos -= speed;
          track.style.transform = `translateX(${xPos}px)`;

          const totalWidth = track.scrollWidth / 2;
          if (Math.abs(xPos) >= totalWidth) {
            xPos = 0;
            track.style.transform = `translateX(0px)`;
          }
        }
        rafId = requestAnimationFrame(scrollFn);
      };

      rafId = requestAnimationFrame(scrollFn);
      (track as any)._autoScrollRaf = rafId;
    });

    /* ══════════════════════════════════════════
       EFFECT 9: SVG 装饰路径绘制
       ══════════════════════════════════════════ */
    const svgPaths = $<SVGPathElement>(".deco-svg-path path");
    svgPaths.forEach((path) => {
      const length = path.getTotalLength?.() || 0;
      if (length) {
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 2.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: path,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          },
        );
      }
    });

    /* ══════════════════════════════════════════
       EFFECT 10: 图片悬停视差 (Hover Image Parallax)
       ══════════════════════════════════════════ */
    const galleryItems = $<HTMLElement>(".gallery-masonry-item");
    galleryItems.forEach((item) => {
      const img = item.querySelector<HTMLElement>("img");
      if (!img) return;
      item.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = item.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
        gsap.to(img, {
          x, y, duration: 0.6, ease: "power2.out", overwrite: "auto",
        });
      });
      item.addEventListener("mouseleave", () => {
        gsap.to(img, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" });
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 11: 滚动图片裁剪揭示 (Clip Reveal)
       ══════════════════════════════════════════ */
    const galleryImgs = $<HTMLElement>(".gallery-masonry-item");
    galleryImgs.forEach((item) => {
      gsap.fromTo(
        item,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    });

    /* ══════════════════════════════════════════
       EFFECT 12: 滚动文字变色 (Text Color Shift)
       ══════════════════════════════════════════ */
    const colorShiftEls = $<HTMLElement>(".section-heading h2, .hero-magazine-title");
    colorShiftEls.forEach((el) => {
      gsap.to(el, {
        color: "#F5A891",
        duration: 0.01,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 40%",
          end: "bottom top",
          toggleActions: "play reverse play reverse",
        },
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 13: 页面转场动画 (Page Transition)
       ══════════════════════════════════════════ */
    $<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e: MouseEvent) => {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();

        const mainContent = document.querySelector<HTMLElement>("#main-content");
        if (!mainContent) {
          gsap.to(window, { scrollTo: { y: target, offsetY: 64 }, duration: 1.0, ease: "power3.inOut" });
          return;
        }

        const tl = gsap.timeline({
          onComplete: () => {
            gsap.to(window, {
              scrollTo: { y: target, offsetY: 64 },
              duration: 0.8,
              ease: "power2.inOut",
              onComplete: () => {
                gsap.to(mainContent, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
              },
            });
          },
        });

        tl.to(mainContent, { opacity: 0, y: -12, duration: 0.25, ease: "power2.in" });
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 14: Scroll Parallax (existing)
       ══════════════════════════════════════════ */
    const hero = $1<HTMLElement>(".hero");
    const heroContent = $1<HTMLElement>(".hero-cover-content");

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

    /* ══════════════════════════════════════════
       EFFECT 11: Cards scroll-reveal (existing)
       ══════════════════════════════════════════ */
    const cardSections = $<HTMLElement>(".section-shell:not(.hero)");

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

    /* ══════════════════════════════════════════
       EFFECT 12: Magnetic Buttons (existing)
       ══════════════════════════════════════════ */
    const magneticBtns = $<HTMLElement>(
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

    /* ══════════════════════════════════════════
       EFFECT 13: 3D Card Tilt (existing)
       ══════════════════════════════════════════ */
    const tiltCards = $<HTMLElement>(
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

    // ── Refresh ScrollTrigger ──
    ScrollTrigger.refresh();

    return () => {
      // Cleanup RAFs
      $<HTMLElement>(".gallery-auto-scroll").forEach((el) => {
        const rafId = (el as any)._autoScrollRaf;
        if (rafId) cancelAnimationFrame(rafId);
        (el as any)._autoScrollIO?.disconnect();
      });

      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);
}
