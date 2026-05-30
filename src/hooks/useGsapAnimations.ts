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
  const guardRef = useRef(false);

  useEffect(() => {
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
       EFFECT 5: Text Morph (文字轮换 — 交叉淡入淡出)
       ══════════════════════════════════════════ */
    const morphContainer = $1<HTMLElement>(".hero-magazine-subtitle")?.parentElement;
    const morphEl = $1<HTMLElement>(".hero-magazine-subtitle");
    if (morphContainer && morphEl) {
      // Create a clone element for crossfade
      const morphClone = morphEl.cloneNode(true) as HTMLElement;
      morphClone.style.position = "absolute";
      morphClone.style.inset = "0";
      morphClone.style.pointerEvents = "none";
      morphContainer.style.position = "relative";
      morphContainer.appendChild(morphClone);

      const tl = gsap.timeline({ repeat: -1, delay: 3.5 });
      let currentEl = morphEl;
      let nextEl = morphClone;

      morphPhrases.forEach((phrase, i) => {
        if (i === 0) return;

        tl
          .call(() => {
            // Swap roles
            const temp = currentEl;
            currentEl = nextEl;
            nextEl = temp;
            nextEl.textContent = phrase;
            gsap.set(nextEl, { opacity: 0, scale: 0.92, filter: "blur(6px)" });
          })
          .to(currentEl, {
            opacity: 0,
            scale: 0.92,
            filter: "blur(6px)",
            duration: 0.35,
            ease: "power2.in",
          }, 0)
          .to(nextEl, {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.5,
            ease: "power2.out",
          }, 0.2)
          .to({}, { duration: 3.0, ease: "none" });
      });
    }

    /* EFFECT 6 removed — superseded by EFFECT 13 (Page Transition) */

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
    const hoverCleanups: Array<() => void> = [];
    galleryItems.forEach((item) => {
      const img = item.querySelector<HTMLElement>("img");
      if (!img) return;
      const onMove = (e: MouseEvent) => {
        const rect = item.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
        gsap.to(img, {
          x, y, duration: 0.6, ease: "power2.out", overwrite: "auto",
        });
      };
      const onLeave = () => {
        gsap.to(img, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" });
      };
      item.addEventListener("mousemove", onMove);
      item.addEventListener("mouseleave", onLeave);
      hoverCleanups.push(() => {
        item.removeEventListener("mousemove", onMove);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    /* ══════════════════════════════════════════
       EFFECT 11: 滚动图片裁剪揭示 (Clip Reveal)
       ══════════════════════════════════════════ */
    const galleryImgs = $<HTMLElement>(".gallery-masonry-item");
    galleryImgs.forEach((item, i) => {
      if (i < 3) return; // First 3 remain fully visible
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
       EFFECT 13: 页面转场动画 (Page Transition)
       ══════════════════════════════════════════ */
    const anchorCleanups: Array<() => void> = [];
    $<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      const onClick = (e: MouseEvent) => {
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

        // Clip-path circle transition overlay
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:999;pointer-events:none;background:#FEF3DD;clip-path:circle(0% at 50% 50%);";
        document.body.appendChild(overlay);

        const tl = gsap.timeline();
        tl.to(overlay, { clipPath: "circle(150% at 50% 50%)", duration: 0.4, ease: "power3.inOut" });
        tl.to(mainContent, { opacity: 0, y: -12, duration: 0.1, ease: "power2.in" }, 0);
        tl.to(overlay, {
          background: "radial-gradient(circle at 50% 50%, #FEF3DD 0%, #F5E6D3 40%, #E8D5C4 100%)",
          duration: 0.01,
        }, 0);
        tl.to({}, {
          duration: 0.3,
          onComplete: () => {
            gsap.to(window, {
              scrollTo: { y: target, offsetY: 64 },
              duration: 0.6,
              ease: "expo.inOut",
              onComplete: () => {
                gsap.to(mainContent, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
                gsap.to(overlay, {
                  clipPath: "circle(0% at 50% 50%)",
                  background: "radial-gradient(circle at 50% 50%, #FEF3DD 0%, #F5E6D3 100%)",
                  duration: 0.4,
                  ease: "power3.in",
                  onComplete: () => overlay.remove(),
                });
              },
            });
          },
        });
      };
      anchor.addEventListener("click", onClick);
      anchorCleanups.push(() => anchor.removeEventListener("click", onClick));
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
       EFFECT 15: Cards scroll-reveal (existing)
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
       EFFECT 17: Stacked Scroll Story (sticky cards)
       Each card reveals image + text as user scrolls through it
       ══════════════════════════════════════════ */
    const storyCards = $<HTMLElement>(".story-stack-card");
    if (storyCards.length) {
      storyCards.forEach((card) => {
        const image = card.querySelector<HTMLElement>(".story-stack-image");
        const text = card.querySelector<HTMLElement>(".story-stack-text");
        const accent = card.querySelector<HTMLElement>(".story-stack-accent-line");

        if (image) {
          // Subtle scale/brightness entrance — image stays visible at all times
          gsap.fromTo(image,
            { scale: 1.06, filter: "brightness(0.88)" },
            {
              scale: 1,
              filter: "brightness(1)",
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 80%",
                end: "top 30%",
                scrub: 1.2,
              },
            },
          );
        }

        if (text) {
          // Text slides in — but starts mostly visible
          gsap.fromTo(text,
            { opacity: 0.7, x: -12 },
            {
              opacity: 1, x: 0,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 75%",
                end: "top 35%",
                scrub: 1.2,
              },
            },
          );
        }

        if (accent) {
          gsap.fromTo(accent,
            { width: 0 },
            {
              width: 28,
              duration: 0.4,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 75%",
                end: "top 50%",
                scrub: 1,
              },
            },
          );
        }
      });
    }

    /* ══════════════════════════════════════════
       EFFECT 18: Price Countdown — 从高价慢慢降到实际价
       ══════════════════════════════════════════ */
    const priceEls = $<HTMLElement>('[data-count-format="price"]');
    priceEls.forEach((el) => {
      const rawTarget = el.getAttribute("data-count-target");
      const prefix = el.getAttribute("data-count-prefix") || "¥";
      const suffix = el.getAttribute("data-count-suffix") || "";
      const targetVal = parseFloat(rawTarget || "0");
      if (!targetVal) return;

      // For small prices (under 100), use 3x multiplier so drop is visible
      const multiplier = targetVal < 100 ? 3 : 1.8;
      let startVal = Math.ceil(targetVal * multiplier / 100) * 100;
      // Ensure at least 100 difference so animation is obvious
      if (startVal - targetVal < 100) {
        startVal = Math.ceil((targetVal + 200) / 100) * 100;
      }

      const card = el.closest(".package-card") || el.parentElement;

      // 1. 页面加载就设置高价文本，用户翻到时就看见 ¥200/h
      el.textContent = `${prefix}${startVal}${suffix}`;

      // 2. fromTo 明确起止值，invalidateOnRefresh 防位置偏差
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

    // ── Refresh ScrollTrigger ──
    ScrollTrigger.refresh();

    return () => {
      // Cleanup RAFs
      $<HTMLElement>(".gallery-auto-scroll").forEach((el) => {
        const rafId = (el as any)._autoScrollRaf;
        if (rafId) cancelAnimationFrame(rafId);
        (el as any)._autoScrollIO?.disconnect();
      });

      // Cleanup hover parallax listeners
      hoverCleanups.forEach((fn) => fn());

      // Cleanup anchor click listeners
      anchorCleanups.forEach((fn) => fn());

      // Reset guard so effect can re-init on StrictMode double-render
      guardRef.current = false;
    };
  }, [guardRef]);
}
