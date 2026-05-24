import { Check, MessageCircle } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";
import { Section } from "./Section";

const packageFit: Record<string, { scene: string; people: string }> = {
  "室内写真": {
    scene: "适合场景：室内棚拍、探店、轻量主题、不想受天气影响的拍摄。",
    people: "适合人群：第一次拍照、想要安静环境和更稳定光线的女生。",
  },
  "室外约拍": {
    scene: "适合场景：南京公园、街区散步、江南感路线和自然光日常记录。",
    people: "适合人群：喜欢自然互动、情侣纪念或想拍松弛感照片的人。",
  },
  "拍立得加拍": {
    scene: "适合场景：拍摄当天留一张实体小照片，作为即时纪念。",
    people: "适合人群：想要更有仪式感、喜欢胶片小物和实体照片的人。",
  },
};

export function Packages() {
  const { packages, sectionCopy, siteConfig } = useSiteContent();

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
              <strong>
                <span
                  data-count-target={item.price.match(/^[\d.]+/)?.[0] || "0"}
                  data-count-suffix={item.price.replace(/^[\d.]+/, "")}
                  data-count-format="price"
                  data-count-prefix="¥"
                >
                  {/* GSAP manages this text via el.textContent */}
                </span>
              </strong>
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
            {packageFit[item.name] ? (
              <div className="package-fit">
                <p>{packageFit[item.name].scene}</p>
                <p>{packageFit[item.name].people}</p>
              </div>
            ) : null}
            <a className="package-cta" href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
              <MessageCircle size={15} />
              预约这个套餐
            </a>
          </article>
        ))}
      </div>
    </Section>
  );
}
