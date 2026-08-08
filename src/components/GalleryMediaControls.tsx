import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { PhotoItem } from "../types/photo";
import { ImageWithFallback } from "./ImageWithFallback";
import { ShareMenu } from "./ShareMenu";

export function GalleryVideoPreview({ videoUrl, posterUrl, title }: { videoUrl: string; posterUrl: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const playVideo = () => {
    setPlaying(true);
    videoRef.current?.play().catch(() => {});
  };

  const pauseVideo = () => {
    setPlaying(false);
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  };

  const toggleTouchPlay = () => {
    if (videoRef.current?.paused) playVideo();
    else pauseVideo();
  };

  return (
    <div
      className="gallery-video-wrap"
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      onTouchStart={toggleTouchPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleTouchPlay();
      }}
      aria-label={`Play video: ${title}`}
    >
      {!playing && (
        <ImageWithFallback
          src={posterUrl}
          alt={title}
          title={title}
          tone="cream"
          sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
        />
      )}
      <video
        ref={videoRef}
        className={`gallery-video-preview ${playing ? "is-playing" : ""}`}
        src={videoUrl}
        poster={posterUrl}
        muted
        loop
        playsInline
        preload="none"
        aria-label={title}
      />
      <span className="gallery-video-badge"><Play size={12} aria-hidden="true" /></span>
    </div>
  );
}

export function GalleryShareButton({ photo }: { photo: PhotoItem }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/gallery/${photo.id}` : "";
  return (
    <span onClick={(event) => event.stopPropagation()} role="presentation">
      <ShareMenu
        variant="icon"
        url={url}
        title={photo.title}
        text={`${photo.title} - ${photo.location}`}
      />
    </span>
  );
}
