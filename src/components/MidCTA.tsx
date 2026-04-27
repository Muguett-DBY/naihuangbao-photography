import { MessageCircle } from "lucide-react";
import { siteConfig } from "../data/site";
import { useInView } from "../hooks/useInView";

export function MidCTA() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2 });

  return (
    <section className={`mid-cta ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="mid-cta-card">
        <h2>喜欢这种风格吗？</h2>
        <p>小红书私信聊聊你的想法，回复很快。</p>
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          <MessageCircle size={18} />
          小红书私信咨询
        </a>
      </div>
    </section>
  );
}
