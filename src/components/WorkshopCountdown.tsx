import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";

interface WorkshopCountdownProps {
  eventDate: string;
  eventTime?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(dateStr: string, timeStr?: string): TimeLeft {
  const target = new Date(timeStr ? `${dateStr}T${timeStr}` : dateStr);
  const now = Date.now();
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function WorkshopCountdown({ eventDate, eventTime }: WorkshopCountdownProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(eventDate, eventTime));
  const prevRef = useRef<TimeLeft>(timeLeft);
  const digitsRef = useRef<Record<string, HTMLSpanElement | null>>({});

  const animateDigit = useCallback((key: string, value: number) => {
    const el = digitsRef.current[key];
    if (!el) return;
    const prev = prevRef.current[key as keyof TimeLeft];
    if (prev === value) return;

    gsap.fromTo(
      el,
      { y: -8, opacity: 0, scale: 1.15 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" },
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const next = calcTimeLeft(eventDate, eventTime);
      if (
        next.days === prevRef.current.days &&
        next.hours === prevRef.current.hours &&
        next.minutes === prevRef.current.minutes &&
        next.seconds === prevRef.current.seconds
      ) {
        return;
      }
      Object.keys(next).forEach((k) => animateDigit(k, next[k as keyof TimeLeft]));
      prevRef.current = next;
      setTimeLeft(next);
    }, 1000);
    return () => clearInterval(id);
  }, [eventDate, eventTime, animateDigit]);

  const expired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  if (expired) return null;

  const units: Array<{ key: keyof TimeLeft; labelKey: string }> = [
    { key: "days", labelKey: "countdown.days" },
    { key: "hours", labelKey: "countdown.hours" },
    { key: "minutes", labelKey: "countdown.minutes" },
    { key: "seconds", labelKey: "countdown.seconds" },
  ];

  return (
    <div className="workshop-countdown">
      {units.map(({ key, labelKey }) => (
        <div className="countdown-unit" key={key}>
          <span
            className="countdown-number"
            ref={(el) => { digitsRef.current[key] = el; }}
          >
            {String(timeLeft[key]).padStart(2, "0")}
          </span>
          <span className="countdown-label">{t(labelKey as "countdown.days")}</span>
        </div>
      ))}
    </div>
  );
}
