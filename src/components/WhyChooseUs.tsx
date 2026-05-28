import { Camera, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { Card } from "animal-island-ui";
import { useSiteContent } from "../hooks/useSiteContent";
import type { WhyCardIcon } from "../types/content";
import { Section } from "./Section";

const icons: Record<WhyCardIcon, typeof Heart> = {
  heart: Heart,
  camera: Camera,
  message: MessageCircle,
  shield: ShieldCheck,
};

export function WhyChooseUs() {
  const { sectionCopy, whyCards } = useSiteContent();

  return (
    <Section
      id="why"
      eyebrow={sectionCopy.why.eyebrow}
      title={sectionCopy.why.title}
      intro={sectionCopy.why.intro}
    >
      <div className="why-grid">
        {whyCards.map((card, index) => {
          const Icon = icons[card.icon];
          return (
            <Card className="why-card" key={card.title} data-index={index + 1}>
              <div className="why-icon"><Icon size={22} aria-hidden="true" /></div>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
