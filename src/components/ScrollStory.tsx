import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { galleryItems } from "../data/gallery";

const STORY_IMGS = [
  galleryItems[0]?.imageUrl || "",
  galleryItems[2]?.imageUrl || "",
  galleryItems[4]?.imageUrl || "",
];

const STORY_ALTS = [
  "南京园林荷花池旁的江南感女生写真",
  "南京公园绿篱前阳光透过树叶的清新女生写真",
  "南京街边花店前红砖墙的女生生活写真",
];

export function ScrollStory() {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLElement>(null);
  const stories = t("scrollStory.cards", { returnObjects: true }) as Array<{ title: string; line: string; text: string }>;

  return (
    <section ref={wrapRef} className="story-stack">
      {stories.map((s, i) => (
        <div key={String(i + 1).padStart(2, "0")} className="story-stack-card">
          {/* Large index watermark */}
          <div className="story-stack-index" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </div>

          <motion.div
            className="story-stack-image-wrap"
            initial={{ scale: 1.06, filter: "brightness(0.88)" }}
            whileInView={{ scale: 1, filter: "brightness(1)" }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={STORY_IMGS[i] || ""}
              alt={STORY_ALTS[i] || s.title}
              loading={i === 0 ? "eager" : "lazy"}
              className="story-stack-image"
              width={600}
              height={800}
            />
            {/* Warm glow reflection */}
            <div className="story-stack-glow" />
          </motion.div>

          <motion.div
            className="story-stack-text"
            initial={{ opacity: 0.7, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-25% 0px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="story-stack-accent-line" />
            <h2 className="story-stack-title">{s.title}</h2>
            <p className="story-stack-line">{s.line}</p>
            <p className="story-stack-body">{s.text}</p>
          </motion.div>
        </div>
      ))}
    </section>
  );
}
