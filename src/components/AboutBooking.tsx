import { ExternalLink, HeartHandshake, MessageCircle } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useSiteContent } from "../hooks/useSiteContent";

export function AboutBooking() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });
  const { sectionCopy, siteConfig } = useSiteContent();

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
        <a
          className="booking-cta"
          href={siteConfig.xiaohongshuProfile}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={16} />
          {siteConfig.contactStatus}
        </a>
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          {sectionCopy.about.profileLinkLabel}
          <ExternalLink size={15} />
        </a>
      </div>
    </section>
  );
}
