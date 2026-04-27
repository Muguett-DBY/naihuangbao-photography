import { ExternalLink, HeartHandshake } from "lucide-react";
import { siteConfig } from "../data/site";

export function AboutBooking() {
  return (
    <section id="booking" className="booking-section">
      <div className="about-copy">
        <p>About</p>
        <h2>{siteConfig.brandName}</h2>
        <span>
          这是一个面向南京女生写真和情侣约拍的个人摄影品牌。正式文案后续可替换为摄影师介绍、拍摄偏好、常去地点和真实作品授权说明。
        </span>
      </div>
      <div className="booking-card">
        <HeartHandshake size={28} />
        <h2>想约一组温柔自然的照片？</h2>
        <p>{siteConfig.contactHint}</p>
        <button type="button" disabled>
          {siteConfig.contactStatus}
        </button>
        <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">
          查看小红书主页
          <ExternalLink size={15} />
        </a>
      </div>
    </section>
  );
}
