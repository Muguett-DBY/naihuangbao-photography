import { MessageCircle } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";

export function FloatingBookingCta() {
  const { siteConfig } = useSiteContent();

  return (
    <a
      className="floating-booking-cta"
      href={siteConfig.xiaohongshuProfile}
      target="_blank"
      rel="noreferrer"
      aria-label="打开小红书私信预约"
    >
      <MessageCircle size={17} />
      <span>小红书预约</span>
    </a>
  );
}
