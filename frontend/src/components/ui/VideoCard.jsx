
// src/components/ui/VideoCard.jsx

import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Heart,
  Maximize2,
  Loader2,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

const VideoCard = ({
  video,
  onClick,
  autoplay = false,
  showControls = true,
  showLike = true,
  className = "",
}) => {
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(Boolean(video?.isLiked));
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const videoUrl = video?.url || video?.videoUrl || "";
  const posterUrl =
    video?.thumbnailUrl ||
    video?.coverUrl ||
    video?.poster ||
    "";

  const title = video?.title || "Tour video";
  const location = video?.location || "AI Tour Rwanda";

  useEffect(() => {
    setLiked(Boolean(video?.isLiked));
  }, [video?.id, video?._id, video?.isLiked]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const updateProgress = () => {
      if (element.duration && Number.isFinite(element.duration)) {
        setProgress((element.currentTime / element.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    element.addEventListener("timeupdate", updateProgress);
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);

    return () => {
      element.removeEventListener("timeupdate", updateProgress);
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !autoplay || !videoUrl) return;

    element.play().catch(() => {
      // Browsers may block autoplay.
    });
  }, [autoplay, videoUrl]);

  const togglePlay = async (event) => {
    event.stopPropagation();

    const element = videoRef.current;
    if (!element || hasError || !videoUrl) return;

    try {
      if (element.paused) {
        await element.play();
      } else {
        element.pause();
      }
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const toggleMute = (event) => {
    event.stopPropagation();

    const element = videoRef.current;
    if (!element) return;

    element.muted = !element.muted;
    setIsMuted(element.muted);
  };

  const toggleFullscreen = async (event) => {
    event.stopPropagation();

    const element = videoRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to open fullscreen:", error);
    }
  };

  const toggleLike = (event) => {
    event.stopPropagation();

    // This is local UI state only.
    // Connect this to your likes API to persist likes.
    setLiked((previous) => !previous);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <article
      onClick={() => onClick?.(video)}
      className={`
        relative group w-full min-w-0 h-[380px]
        overflow-hidden rounded-2xl bg-[#374151]
        shadow-lg transition-transform duration-300
        hover:scale-[1.01]
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {!videoUrl || hasError ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#374151] p-5 text-center text-white">
          <AlertCircle className="h-10 w-10 text-[#F59E0B]" />
          <p className="text-sm text-white/80">
            {videoUrl
              ? "Unable to load this video."
              : "Video is not available."}
          </p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
            className="h-full w-full object-cover"
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={handleVideoError}
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <Loader2 className="relative z-10 h-9 w-9 animate-spin text-white" />
            </div>
          )}
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

      <div className="absolute bottom-5 left-4 right-4">
        <h3 className="line-clamp-1 text-lg font-bold text-white">
          {title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-white/75">
          {location}
        </p>
      </div>

      {showControls && videoUrl && !hasError && (
        <>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488]/90 text-white shadow-md transition hover:bg-[#0D9488]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            className="absolute bottom-[76px] right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="View fullscreen"
            className="absolute bottom-[76px] right-16 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Maximize2 size={16} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#0D9488] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {showLike && (
        <button
          type="button"
          onClick={toggleLike}
          aria-label={liked ? "Unlike video" : "Like video"}
          aria-pressed={liked}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <Heart
            size={18}
            className={
              liked
                ? "fill-[#F59E0B] text-[#F59E0B]"
                : "text-white"
            }
          />
        </button>
      )}

      {video?.isAIPreview === true && (
        <div className="absolute bottom-[76px] left-4 rounded-full bg-[#0D9488] px-3 py-1 text-xs font-semibold text-white shadow">
          AI Preview
        </div>
      )}
    </article>
  );
};

export default VideoCard;
