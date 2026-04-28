import { Check } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { Section } from "./Section";

export function Packages() {
  const { packages, sectionCopy } = useSiteContent();

  return (
    <Section
      id="packages"
      eyebrow={sectionCopy.packages.eyebrow}
      title={sectionCopy.packages.title}
      intro={sectionCopy.packages.intro}
    >
      <div className="package-grid">
        {packages.map((item, index) => (
          <article className={`package-card${index === 1 ? " is-popular" : ""}`} key={item.name}>
            {index === 1 && <span className="package-badge">推荐</span>}
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
