import { MessageCircle } from "lucide-react";
import { useBookingModal } from "../hooks/useBookingModal";

export function FloatingBookingCta() {
  const { openBookingModal } = useBookingModal();

  return (
    <button
      className="floating-booking-cta"
      onClick={() => openBookingModal()}
      type="button"
      aria-label="预约拍摄"
    >
      <MessageCircle size={17} />
      <span>预约</span>
    </button>
  );
}
