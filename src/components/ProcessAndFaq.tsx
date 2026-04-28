import { ShieldCheck } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { Section } from "./Section";

export function ProcessAndFaq() {
  const { faqs, processSteps, sectionCopy } = useSiteContent();

  return (
    <Section
      id="notice"
      eyebrow={sectionCopy.notice.eyebrow}
      title={sectionCopy.notice.title}
      intro={sectionCopy.notice.intro}
    >
      <div className="process-grid">
        {processSteps.map((step, index) => (
          <div className="process-step" key={`${step}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
      <div className="notice-layout">
        <div className="safety-panel">
          <ShieldCheck size={24} />
          <h3>{sectionCopy.safety.title}</h3>
          {sectionCopy.safety.paragraphs.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
