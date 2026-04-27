import { Check } from "lucide-react";
import { packages } from "../data/packages";
import { Section } from "./Section";

export function Packages() {
  return (
    <Section
      id="packages"
      eyebrow="Packages"
      title="先了解适合你的拍摄方式"
      intro="每种拍摄方式都包含风格沟通和全程引导，先看看哪种更适合你。"
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
