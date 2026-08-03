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

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// ===============================

const VideoCard = ({ 
  video, 
  onClick,
  autoplay = false,
  showControls = true,
  className = "",
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Autoplay if enabled
  useEffect(() => {
    if (autoplay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [autoplay]);

  // Handle video progress
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateProgress = () => {
      if (videoElement.duration) {
        setProgress((videoElement.currentTime / videoElement.duration) * 100);
      }
    };

    videoElement.addEventListener('timeupdate', updateProgress);
    return () => videoElement.removeEventListener('timeupdate', updateProgress);
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && !hasError) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current || hasError) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoLoaded = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      onClick={() => onClick?.(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative
        min-w-[280px]
        w-full
        h-[380px]
        rounded-2xl
        overflow-hidden
        cursor-pointer
        group
        shadow-lg
        bg-black
        hover:scale-[1.02]
        transition-all
        duration-300
        ${className}
      `}
    >
      {/* VIDEO */}
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-sm text-gray-400">Unable to load video</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={video.url}
            className="w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            onLoadedData={handleVideoLoaded}
            onError={handleVideoError}
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}
        </>
      )}

      {/* DARK OVERLAY - Only show on hover or when not playing */}
      <div className={`
        absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20
        transition-opacity duration-300
        ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
      `} />

      {/* TITLE - Always visible, hidden when playing on hover */}
      <div className={`
        absolute bottom-4 left-4 right-4
        transition-opacity duration-300
        ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
      `}>
        <h3 className="text-white font-bold text-lg line-clamp-1">
          {video.title}
        </h3>
        <p className="text-white/70 text-sm line-clamp-1">
          {video.location || "AI Tour Rwanda"}
        </p>
      </div>

      {/* PLAY BUTTON */}
      {showControls && (
        <button
          onClick={togglePlay}
          disabled={hasError}
          className={`
            absolute
            top-4
            left-4
            w-10
            h-10
            rounded-full
            bg-white/20
            backdrop-blur-md
            flex
            items-center
            justify-center
            text-white
            hover:bg-white/30
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
          `}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </button>
      )}

      {/* LIKE BUTTON */}
      <button
        onClick={toggleLike}
        className="
          absolute
          top-4
          right-4
          w-10
          h-10
          rounded-full
          bg-white/20
          backdrop-blur-md
          flex
          items-center
          justify-center
          hover:bg-white/30
          transition
        "
      >
        <Heart
          size={18}
          className={`transition-colors duration-300 ${
            liked ? "text-[#F59E0B] fill-[#F59E0B]" : "text-white hover:text-[#F59E0B]"
          }`}
        />
      </button>

      {/* MUTE BUTTON - Shows on hover */}
      <button
        onClick={toggleMute}
        className={`
          absolute
          bottom-16
          right-4
          w-8
          h-8
          rounded-full
          bg-black/50
          backdrop-blur-md
          flex
          items-center
          justify-center
          text-white
          hover:bg-black/70
          transition
          opacity-0
          group-hover:opacity-100
        `}
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* FULLSCREEN BUTTON - Shows on hover */}
      <button
        onClick={handleFullscreen}
        className="
          absolute
          bottom-16
          right-14
          w-8
          h-8
          rounded-full
          bg-black/50
          backdrop-blur-md
          flex
          items-center
          justify-center
          text-white
          hover:bg-black/70
          transition
          opacity-0
          group-hover:opacity-100
        "
      >
        <Maximize2 size={14} />
      </button>

      {/* PROGRESS BAR - Shows on hover */}
      <div className="
        absolute
        bottom-0
        left-0
        right-0
        h-1
        bg-white/20
        opacity-0
        group-hover:opacity-100
        transition-opacity
        duration-300
      ">
        <div 
          className="h-full bg-[#0D9488] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* AI BADGE */}
      <div className="absolute bottom-16 left-4">
        <span className="bg-[#0D9488] text-white text-xs px-3 py-1 rounded-full shadow-lg">
          AI Preview
        </span>
      </div>

      {/* VIEWS COUNT - Optional */}
      {video.views && (
        <div className="absolute top-4 left-20 text-white/70 text-xs">
          👁️ {video.views}
        </div>
      )}
    </div>
  );
};

export default VideoCard;