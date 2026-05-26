import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Button, Card } from "animal-island-ui";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";
import { Section } from "./Section";

const PACKAGE_SLUGS = ["indoor", "outdoor", "instant"] as const;

export function Packages() {
  const { t } = useTranslation();
  const { packages, sectionCopy } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <Section
      id="packages"
      eyebrow={sectionCopy.packages.eyebrow}
      title={sectionCopy.packages.title}
      intro={sectionCopy.packages.intro}
    >
      <div className="package-grid">
        {packages.map((item, index) => (
          <Card className={`package-card${index === 1 ? " is-popular" : ""}`} key={item.name}>
            {index === 1 && <span className="package-badge">{t("packages.recommend")}</span>}
            <div>
              <p>{item.duration}</p>
              <h3>{item.name}</h3>
              <strong>
                <AnimatedPrice price={item.price} />
              </strong>
              <span>{item.summary}</span>
            </div>
            <ul>
              {item.includes.map((line) => (
                <li key={line}>
                  <Check size={15} />
                  {line}
                </li>
              ))}
            </ul>
            {index < PACKAGE_SLUGS.length ? (
              <div className="package-fit">
                <p>{t(`packages.fitScene.${PACKAGE_SLUGS[index]}`)}</p>
                <p>{t(`packages.fitPeople.${PACKAGE_SLUGS[index]}`)}</p>
              </div>
            ) : null}
            <Button type="primary" className="package-cta" onClick={() => openBookingModal(item.name)}>
              <MessageCircle size={15} />
              {t("packages.bookThis")}
            </Button>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function AnimatedPrice({ price }: { price: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(() => initialPriceValue(price));
  const [animationState, setAnimationState] = useState<"idle" | "running" | "settled">("idle");

  const priceParts = useMemo(() => parsePrice(price), [price]);

  useEffect(() => {
    if (!priceParts) {
      setDisplayValue(price);
      return;
    }

    setDisplayValue(formatPrice(priceParts.start, priceParts));
    setAnimationState("idle");
  }, [price, priceParts]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !priceParts) return;
    let started = false;

    const startAnimation = () => {
      if (started) return;
      started = true;
      setAnimationState("running");
      const startedAt = performance.now();
      const duration = 1450;

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = priceParts.start + (priceParts.target - priceParts.start) * eased;
        setDisplayValue(formatPrice(value, priceParts));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        setDisplayValue(formatPrice(priceParts.target, priceParts));
        setAnimationState("settled");
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startAnimation();
      },
      { threshold: 0.5, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [priceParts]);

  return (
    <span
      ref={ref}
      className={`price-count price-count-${animationState}`}
      aria-label={`价格 ${price}`}
    >
      {displayValue}
    </span>
  );
}

function parsePrice(price: string) {
  const match = price.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const target = Number(match[1]);
  if (!Number.isFinite(target)) return null;
  const decimals = match[1].includes(".") ? match[1].split(".")[1]?.length ?? 0 : 0;
  const start = decimals > 0 ? target + 20 : target + 80;
  return {
    target,
    start,
    decimals,
    suffix: match[2] ?? "",
  };
}

function formatPrice(value: number, parts: NonNullable<ReturnType<typeof parsePrice>>) {
  return `¥${value.toFixed(parts.decimals)}${parts.suffix}`;
}

function initialPriceValue(price: string) {
  const parts = parsePrice(price);
  return parts ? formatPrice(parts.start, parts) : price;
}
