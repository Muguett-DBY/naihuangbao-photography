import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";

interface CapacityBarProps {
  current: number;
  max: number;
}

export function CapacityBar({ current, max }: CapacityBarProps) {
  const { t } = useTranslation();
  const fillRef = useRef<HTMLDivElement>(null);

  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  const pct = Math.round(ratio * 100);

  let colorClass = "capacity-bar--green";
  if (pct >= 80) colorClass = "capacity-bar--red";
  else if (pct >= 50) colorClass = "capacity-bar--yellow";

  const full = pct >= 100;

  useEffect(() => {
    if (!fillRef.current) return;
    gsap.fromTo(
      fillRef.current,
      { width: "0%" },
      { width: `${pct}%`, duration: 0.8, ease: "power2.out" },
    );
  }, [pct]);

  return (
    <div className={`capacity-bar ${colorClass}`}>
      <div className="capacity-fill" ref={fillRef} style={{ width: 0 }} />
      <span className="capacity-text">
        {full ? t("capacity.full") : `${current}/${max} ${t("capacity.spots")}`}
      </span>
    </div>
  );
}
