import { useRef } from "react";
import { galleryItems } from "../data/gallery";

const STORIES = [
  {
    id: "01",
    title: "每一张照片",
    line: "都是一段故事",
    text: "不只是按下快门。从相遇的那一刻起，我们就在共同书写一段视觉叙事。",
    img: galleryItems[0]?.imageUrl || "",
    alt: "南京园林荷花池旁的江南感女生写真",
  },
  {
    id: "02",
    title: "光影之间",
    line: "捕捉真实",
    text: "自然光是最好的画笔。在南京的梧桐树下、老街转角，光影本身就是故事。",
    img: galleryItems[2]?.imageUrl || "",
    alt: "南京公园绿篱前阳光透过树叶的清新女生写真",
  },
  {
    id: "03",
    title: "不止于美",
    line: "更是记忆",
    text: "我们拍的不是完美，是真实。是你们第一次约会的紧张、毕业季的不舍、城市漫游的自由。",
    img: galleryItems[4]?.imageUrl || "",
    alt: "南京街边花店前红砖墙的女生生活写真",
  },
];

export function ScrollStory() {
  const wrapRef = useRef<HTMLElement>(null);

  return (
    <section ref={wrapRef} className="story-stack">
      {STORIES.map((s, i) => (
        <div key={s.id} className="story-stack-card">
          {/* Large index watermark */}
          <div className="story-stack-index" aria-hidden="true">
            {s.id}
          </div>

          <div className="story-stack-image-wrap">
            <img
              src={s.img}
              alt={s.alt || s.title}
              loading={i === 0 ? "eager" : "lazy"}
              className="story-stack-image"
              width={600}
              height={800}
            />
            {/* Warm glow reflection */}
            <div className="story-stack-glow" />
          </div>

          <div className="story-stack-text">
            <div className="story-stack-accent-line" />
            <h2 className="story-stack-title">{s.title}</h2>
            <p className="story-stack-line">{s.line}</p>
            <p className="story-stack-body">{s.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
