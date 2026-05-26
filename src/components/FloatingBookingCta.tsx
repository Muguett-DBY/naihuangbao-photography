import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBookingModal } from "../hooks/useBookingModal";

export function FloatingBookingCta() {
  const { t } = useTranslation();
  const { openBookingModal } = useBookingModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      className={`floating-booking-cta ${visible ? "is-visible" : ""}`}
      onClick={() => openBookingModal()}
      type="button"
      aria-label={t("floatingBookingCta.ariaLabel")}
    >
      <MessageCircle size={17} />
      <span>{t("floatingBookingCta.text")}</span>
    </button>
  );
}
