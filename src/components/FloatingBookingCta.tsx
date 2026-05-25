import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useBookingModal } from "../hooks/useBookingModal";

export function FloatingBookingCta() {
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
      aria-label="预约拍摄"
    >
      <MessageCircle size={17} />
      <span>预约</span>
    </button>
  );
}
