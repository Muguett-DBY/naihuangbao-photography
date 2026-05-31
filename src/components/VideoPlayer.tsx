import { memo } from "react";

function getVideoType(url: string): "youtube" | "vimeo" | "html5" {
  const parsed = parseSafeUrl(url);
  if (!parsed) return "html5";
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(parsed.hostname)) return "youtube";
  if (["vimeo.com", "www.vimeo.com"].includes(parsed.hostname)) return "vimeo";
  return "html5";
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function parseSafeUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function getSafeMediaUrl(url: string) {
  const parsed = parseSafeUrl(url);
  if (!parsed) return null;
  if (parsed.origin === window.location.origin) return parsed.pathname + parsed.search + parsed.hash;
  return parsed.protocol === "https:" ? parsed.toString() : null;
}

export const VideoPlayer = memo(function VideoPlayer({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const type = getVideoType(src);

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    paddingBottom: "56.25%",
    borderRadius: 16,
    overflow: "hidden",
    background: "var(--custard-soft, #FFE8C5)",
  };

  const sharedIframeStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
  };

  const sharedVideoStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
  };

  if (type === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(src);
    if (!embedUrl) return <VideoUnavailable className={className} />;
    return (
      <div style={wrapperStyle} className={className}>
        <iframe
          src={embedUrl}
          title={title}
          style={sharedIframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === "vimeo") {
    const embedUrl = getVimeoEmbedUrl(src);
    if (!embedUrl) return <VideoUnavailable className={className} />;
    return (
      <div style={wrapperStyle} className={className}>
        <iframe
          src={embedUrl}
          title={title}
          style={sharedIframeStyle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const mediaUrl = getSafeMediaUrl(src);
  if (!mediaUrl) return <VideoUnavailable className={className} />;

  return (
    <div style={wrapperStyle} className={className}>
      <video
        src={mediaUrl}
        controls
        preload="metadata"
        aria-label={title}
        style={sharedVideoStyle}
      />
    </div>
  );
});

function VideoUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 16,
        background: "var(--custard-soft, #FFE8C5)",
        color: "var(--caramel-muted, #8B7A6A)",
        padding: 24,
        textAlign: "center",
      }}
    >
      Video unavailable
    </div>
  );
}
