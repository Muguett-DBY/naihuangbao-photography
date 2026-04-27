import { siteConfig } from "../data/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <span>{siteConfig.brandName}</span>
      <p>{siteConfig.city} · 女生写真 · 情侣约拍 · {siteConfig.domain}</p>
    </footer>
  );
}
