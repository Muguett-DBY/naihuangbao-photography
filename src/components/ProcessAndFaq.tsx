import { ShieldCheck } from "lucide-react";
import { faqs, processSteps } from "../data/faq";
import { Section } from "./Section";

export function ProcessAndFaq() {
  return (
    <Section
      id="notice"
      eyebrow="Process"
      title="边界清楚，拍摄才会更放松"
      intro="网站会把预约、隐私和授权规则放在用户能看见的位置，减少反复解释。"
    >
      <div className="process-grid">
        {processSteps.map((step, index) => (
          <div className="process-step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
      <div className="notice-layout">
        <div className="safety-panel">
          <ShieldCheck size={24} />
          <h3>安全与边界说明</h3>
          <p>只接受女生或情侣约拍。尊重拍摄者隐私，未经明确授权不会公开客片。</p>
          <p>不接受让摄影师或客人不舒适的越界拍摄需求。</p>
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
