import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "animal-island-ui";
import { useSiteContent } from "../hooks/useSiteContent";
import { useBookingModal } from "../hooks/useBookingModal";

export function MidCTA() {
  const { sectionCopy, siteConfig } = useSiteContent();
  const { openBookingModal } = useBookingModal();

  return (
    <motion.section
      id="mid-cta"
      className="mid-cta"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mid-cta-card">
        <p className="mid-cta-eyebrow">{sectionCopy.midCta.eyebrow}</p>
        <h2>{sectionCopy.midCta.title}</h2>
        <p className="mid-cta-desc">{sectionCopy.midCta.intro}</p>
        <Button type="primary" size="large" className="mid-cta-btn" onClick={() => openBookingModal()}>
          <MessageCircle size={18} />
          {sectionCopy.midCta.actionLabel}
        </Button>
      </div>
    </motion.section>
  );
}
