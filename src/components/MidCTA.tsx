import { MessageCircle } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useSiteContent } from "../hooks/useSiteContent";

export function MidCTA() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });
  const { sectionCopy, siteConfig } = useSiteContent();

  return (
    <section id="mid-cta" className={`mid-cta ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="mid-cta-card">
        <p className="mid-cta-eyebrow">{sectionCopy.midCta.eyebrow}</p>
        <h2>{sectionCopy.midCta.title}</h2>
        <p className="mid-cta-desc">{sectionCopy.midCta.intro}</p>
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          <MessageCircle size={18} />
          {sectionCopy.midCta.actionLabel}
        </a>
      </div>
    </section>
  );
}
