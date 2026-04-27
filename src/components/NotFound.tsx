import { ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>这个页面不存在，或者已经被移除了。</p>
      <a href="/">
        <ArrowLeft size={18} aria-hidden="true" />
        回到首页
      </a>
    </div>
  );
}
