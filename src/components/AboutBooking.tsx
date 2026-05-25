import { ExternalLink, HeartHandshake, MessageCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useInView } from "../hooks/useInView";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";

export function AboutBooking() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });
  const { sectionCopy, siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <section id="booking" className={`booking-section ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="about-copy">
        <p>{sectionCopy.about.eyebrow}</p>
        <h2>{sectionCopy.about.title || siteConfig.brandName}</h2>
        <span>{sectionCopy.about.body}</span>
      </div>
      <div className="booking-card">
        <HeartHandshake size={28} />
        <h2>{sectionCopy.about.bookingTitle}</h2>
        <p>{siteConfig.contactHint}</p>
        <Button
          type="primary"
          className="booking-cta"
          onClick={() => openBookingModal()}
        >
          <MessageCircle size={16} />
          {siteConfig.contactStatus}
        </Button>
        <Button type="link" href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          {sectionCopy.about.profileLinkLabel}
          <ExternalLink size={15} />
        </Button>
      </div>
    </section>
  );
}
