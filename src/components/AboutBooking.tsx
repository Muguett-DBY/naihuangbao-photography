import { ExternalLink, HeartHandshake, MessageCircle } from "lucide-react";
import { siteConfig } from "../data/site";
import { useInView } from "../hooks/useInView";

export function AboutBooking() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.1 });

  return (
    <section id="booking" className={`booking-section ${inView ? "is-visible" : ""}`} ref={ref}>
      <div className="about-copy">
        <p>About</p>
        <h2>{siteConfig.brandName}</h2>
        <span>
          南京个人摄影师，专注女生写真和情侣约拍。拍摄风格偏柔雾胶片感，适合日常记录、江南感写真和轻松陪拍。
        </span>
      </div>
      <div className="booking-card">
        <HeartHandshake size={28} />
        <h2>想约一组温柔自然的照片？</h2>
        <p>{siteConfig.contactHint}</p>
        <a
          className="booking-cta"
          href={siteConfig.xiaohongshuProfile}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={16} />
          {siteConfig.contactStatus}
        </a>
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          查看小红书主页
          <ExternalLink size={15} />
        </a>
      </div>
    </section>
  );
}
