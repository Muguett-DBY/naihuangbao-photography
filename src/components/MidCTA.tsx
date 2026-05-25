import { MessageCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useInView } from "../hooks/useInView";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";

export function MidCTA() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });
  const { sectionCopy, siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <section id="mid-cta" className={`mid-cta ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="mid-cta-card">
        <p className="mid-cta-eyebrow">{sectionCopy.midCta.eyebrow}</p>
        <h2>{sectionCopy.midCta.title}</h2>
        <p className="mid-cta-desc">{sectionCopy.midCta.intro}</p>
        <Button type="primary" size="large" className="mid-cta-btn" onClick={() => openBookingModal()}>
          <MessageCircle size={18} />
          {sectionCopy.midCta.actionLabel}
        </Button>
      </div>
    </section>
  );
}
