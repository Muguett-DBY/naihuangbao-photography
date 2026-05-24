import { useRef } from "react";
import { galleryItems } from "../data/gallery";

const STORY_FRAMES = [
  {
    number: "01",
    title: "每一张照片",
    subtitle: "都是一段故事",
    text: "不只是按下快门。从相遇的那一刻起，我们就在共同书写一段视觉叙事。",
    image: galleryItems[0]?.imageUrl || "",
  },
  {
    number: "02",
    title: "光影之间",
    subtitle: "捕捉真实",
    text: "自然光是最好的画笔。在南京的梧桐树下、老街转角，光影本身就是故事。",
    image: galleryItems[3]?.imageUrl || "",
  },
  {
    number: "03",
    title: "不止于美",
    subtitle: "更是记忆",
    text: "我们拍的不是完美，是真实。是你们第一次约会的紧张、毕业季的不舍、城市漫游的自由。",
    image: galleryItems[6]?.imageUrl || "",
  },
];

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} className="scroll-story">
      <div className="scroll-story-pin">
        {STORY_FRAMES.map((frame, i) => (
          <div key={i} className={`scroll-story-frame scroll-story-frame--${i}`}>
            {/* Background number (decorative) */}
            <div className="scroll-story-bg-number" aria-hidden="true">
              {frame.number}
            </div>

            <div className="scroll-story-visual">
              <img
                src={frame.image}
                alt={frame.title}
                loading={i === 0 ? "eager" : "lazy"}
                className="scroll-story-img"
                width={600}
                height={800}
              />
              <div className="scroll-story-img-glow" />
            </div>

            <div className="scroll-story-content">
              <span className="scroll-story-label">{frame.number}</span>
              <div className="scroll-story-rule" />
              <h2 className="scroll-story-title">{frame.title}</h2>
              <p className="scroll-story-subtitle">{frame.subtitle}</p>
              <p className="scroll-story-text">{frame.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="scroll-story-progress" aria-hidden="true">
        <div className="scroll-story-progress-bar" />
      </div>
    </section>
  );
}
