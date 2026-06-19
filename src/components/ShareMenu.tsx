import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Share2, X } from "lucide-react";
import { useToast } from "./shared/Toast";

type ShareMenuProps = {
  url: string;
  title: string;
  text?: string;
  variant?: "icon" | "pill";
};

type ShareTarget = {
  id: string;
  label: string;
  build: (url: string, title: string) => string;
};

const SHARES: ShareTarget[] = [
  {
    id: "x",
    label: "X / Twitter",
    build: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    build: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "weibo",
    label: "Weibo",
    build: (url, title) => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    build: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

export function ShareMenu({ url, title, text, variant = "icon" }: ShareMenuProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleNativeShare = async () => {
    const shareData = {
      title,
      text: text ?? title,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        setOpen(false);
        return;
      }
    } catch {
      // user cancelled
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("share.copied", "Link copied to clipboard"), "success");
    } catch {
      showToast(t("share.copyFailed", "Could not copy link"), "error");
    }
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast(t("share.copied", "Link copied to clipboard"), "success");
    } catch {
      showToast(t("share.copyFailed", "Could not copy link"), "error");
    }
    setOpen(false);
  };

  return (
    <div className="share-menu" ref={ref}>
      <button
        type="button"
        className={`share-menu-trigger share-menu-trigger--${variant}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("share.label", "Share")}
      >
        {open ? <X size={variant === "icon" ? 16 : 14} aria-hidden="true" /> : <Share2 size={variant === "icon" ? 16 : 14} aria-hidden="true" />}
        {variant === "pill" && <span>{t("share.label", "Share")}</span>}
      </button>
      {open && (
        <div className="share-menu-popover" role="menu" aria-label={t("share.label", "Share")}>
          <button type="button" role="menuitem" onClick={handleNativeShare}>
            <Share2 size={14} /> {t("share.system", "System share")}
          </button>
          <button type="button" role="menuitem" onClick={handleCopy}>
            <Link2 size={14} /> {t("share.copy", "Copy link")}
          </button>
          <div className="share-menu-divider" role="separator" />
          {SHARES.map((target) => (
            <a
              key={target.id}
              role="menuitem"
              href={target.build(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {target.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
