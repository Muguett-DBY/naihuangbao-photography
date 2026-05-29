import { memo } from "react";

function getVideoType(url: string): "youtube" | "vimeo" | "html5" {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url)) return "vimeo";
  return "html5";
}

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function getVimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
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
    return (
      <div style={wrapperStyle} className={className}>
        <iframe
          src={getYouTubeEmbedUrl(src)}
          title={title}
          style={sharedIframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === "vimeo") {
    return (
      <div style={wrapperStyle} className={className}>
        <iframe
          src={getVimeoEmbedUrl(src)}
          title={title}
          style={sharedIframeStyle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle} className={className}>
      <video
        src={src}
        controls
        preload="metadata"
        aria-label={title}
        style={sharedVideoStyle}
      />
    </div>
  );
});
