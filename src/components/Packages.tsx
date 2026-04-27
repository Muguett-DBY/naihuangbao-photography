import { Check } from "lucide-react";
import { packages } from "../data/packages";
import { Section } from "./Section";

export function Packages() {
  return (
    <Section
      id="packages"
      eyebrow="Packages"
      title="先了解适合你的拍摄方式"
      intro="价格、成片数量和交付周期会在正式确认后替换，不编造真实报价。"
    >
      <div className="package-grid">
        {packages.map((item) => (
          <article className="package-card" key={item.name}>
            <div>
              <p>{item.duration}</p>
              <h3>{item.name}</h3>
              <strong>{item.price}</strong>
              <span>{item.summary}</span>
            </div>
            <ul>
              {item.includes.map((line) => (
                <li key={line}>
                  <Check size={15} />
                  {line}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
