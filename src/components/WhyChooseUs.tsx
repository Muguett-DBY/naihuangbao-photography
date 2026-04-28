import { Camera, Heart, ShieldCheck, MessageCircle } from "lucide-react";
import { Section } from "./Section";

export function WhyChooseUs() {
  return (
    <Section
      id="why"
      eyebrow="Why"
      title="为什么选择奶黄包摄影"
    >
      <div className="why-grid">
        <article className="why-card">
          <div className="why-icon"><Heart size={22} aria-hidden="true" /></div>
          <h3>只拍女生和情侣</h3>
          <p>氛围轻松安全，拍摄全程由女摄影师引导，不需要担心尴尬或不适。</p>
        </article>
        <article className="why-card">
          <div className="why-icon"><Camera size={22} aria-hidden="true" /></div>
          <h3>第一次拍也没关系</h3>
          <p>会全程引导动作和情绪，不知道怎么摆姿势完全没问题。</p>
        </article>
        <article className="why-card">
          <div className="why-icon"><MessageCircle size={22} aria-hidden="true" /></div>
          <h3>前期充分沟通</h3>
          <p>拍摄前沟通风格、服装、地点和参考图，确保拍出你想要的效果。</p>
        </article>
        <article className="why-card">
          <div className="why-icon"><ShieldCheck size={22} aria-hidden="true" /></div>
          <h3>隐私保护</h3>
          <p>未经明确授权不会公开任何客片，可以放心拍摄。</p>
        </article>
      </div>
    </Section>
  );
}
