import { Camera, Images, MessageCircle } from "lucide-react";
import { siteConfig } from "../data/site";

export function SiteNav() {
  return (
    <header className="site-nav">
      <a className="brand-mark" href="#top" aria-label="回到首页">
        <Camera size={18} />
        <span>{siteConfig.brandName}</span>
      </a>
      <nav aria-label="主导航">
        <a href="#gallery">作品</a>
        <a href="#packages">套餐</a>
        <a href="#notice">须知</a>
        <a href="/admin/" className="admin-link">
          <Images size={15} />
          后台
        </a>
      </nav>
      <a className="nav-cta" href="#booking">
        <MessageCircle size={16} />
        咨询
      </a>
    </header>
  );
}
