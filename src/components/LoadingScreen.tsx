import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function LoadingScreen() {
  const { t } = useTranslation();
  const [show, setShow] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setShow(false);
    }, 5000);

    import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      const tl = gsap.timeline({
        onComplete: () => { if (!cancelled) setShow(false); },
      });

      tl
        .fromTo(
          logoRef.current,
          { filter: "blur(18px)", opacity: 0, scale: 0.7 },
          { filter: "blur(0px)", opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" },
        )
        .fromTo(
          textRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
          "-=0.3",
        )
        .to(
          wrapRef.current,
          { opacity: 0, scale: 0.95, duration: 0.5, ease: "power2.in" },
          "+=1.0",
        );
    }).catch(() => {
      if (!cancelled) setShow(false);
    });

    return () => { cancelled = true; clearTimeout(fallbackTimer); };
  }, []);

  if (!show) return null;

  return (
    <div
      ref={wrapRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--custard-bg, #FEF3DD)",
        fontFamily: '"Naihuangbao WenKai", "Kaiti SC", "KaiTi", serif',
        overflow: "hidden",
      }}
    >
      <div
        ref={logoRef}
        style={{ width: 80, height: 80, filter: "blur(18px)", opacity: 0 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="80" height="80" aria-hidden="true">
          <rect width="512" height="512" rx="96" fill="var(--custard-cream, #F5E6D3)" />
          <circle cx="256" cy="270" r="126" fill="var(--paper-white, #fff8ed)" stroke="var(--caramel-deep, #7B5C43)" strokeWidth="22" />
          <circle cx="256" cy="270" r="58" fill="var(--caramel-deep, #7B5C43)" />
          <circle cx="338" cy="202" r="21" fill="var(--caramel-deep, #7B5C43)" />
          <path d="M146 146h66l28-36h92l28 36h38c36 0 65 29 65 65v146c0 36-29 65-65 65H114c-36 0-65-29-65-65V211c0-36 29-65 65-65h32Z" fill="none" stroke="var(--caramel-deep, #7B5C43)" strokeWidth="24" strokeLinejoin="round" />
          <path d="M132 177h65" stroke="var(--caramel-deep, #7B5C43)" strokeWidth="20" strokeLinecap="round" />
        </svg>
      </div>
      <div
        ref={textRef}
        style={{
          opacity: 0,
          fontSize: 22,
          color: "var(--caramel-text, #8B5E4A)",
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        {t("loadingScreen.brandName")}
      </div>
      <div style={{ fontSize: 13, color: "var(--caramel-muted, #9C7664)", marginTop: 4 }}>
        {t("loadingScreen.subtitle")}
      </div>
    </div>
  );
}
