import { ShieldCheck } from "lucide-react";
import { Collapse } from "animal-island-ui";
import { useSiteContent } from "../hooks/useSiteContent";
import { Section } from "./Section";

function splitStep(step: string) {
  const [title, detail] = step.split("｜");
  return { title, detail };
}

export function ProcessAndFaq() {
  const { faqs, processSteps, sectionCopy } = useSiteContent();

  return (
    <Section
      id="process"
      eyebrow={sectionCopy.notice.eyebrow}
      title={sectionCopy.notice.title}
      intro={sectionCopy.notice.intro}
    >
      <div className="process-scroll-wrap" aria-label="拍摄流程">
        <div className="process-timeline">
          {processSteps.map((step, index) => {
            const { title, detail } = splitStep(step);
            return (
              <div className="process-step" key={`${step}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                {detail ? <p>{detail}</p> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="notice-layout">
        <div className="safety-panel">
          <ShieldCheck size={24} />
          <h3>{sectionCopy.safety.title}</h3>
          {sectionCopy.safety.paragraphs.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="faq-list" id="faq">
          {faqs.map((item) => (
            <Collapse
              key={item.question}
              question={item.question}
              answer={<p>{item.answer}</p>}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
