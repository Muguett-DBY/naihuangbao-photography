import { Camera, Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "../data/site";

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-nav">
      <a className="brand-mark" href="#top" aria-label="回到首页">
        <Camera size={18} />
        <span>{siteConfig.brandName}</span>
      </a>
      <nav className={`nav-menu${open ? " is-open" : ""}`} aria-label="主导航">
        <a href="#gallery" onClick={() => setOpen(false)}>作品</a>
        <a href="#packages" onClick={() => setOpen(false)}>套餐</a>
        <a href="#notice" onClick={() => setOpen(false)}>须知</a>
      </nav>
      <button className="hamburger" onClick={() => setOpen(!open)} aria-label={open ? "关闭菜单" : "打开菜单"}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <a className="nav-cta" href="#booking">
        <MessageCircle size={16} />
        咨询
      </a>
    </header>
  );
}
