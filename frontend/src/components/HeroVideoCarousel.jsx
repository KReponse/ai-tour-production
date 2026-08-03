// frontend/src/components/HeroVideoCarousel.jsx
// ✅ PREMIUM REDESIGN - Clean, cinematic hero video carousel
// ✅ Removed: Play/Pause, Prev/Next, Explore CTA (moved to Home)
// ✅ Added: Cinematic gradient overlay
// ✅ Premium indicator dots with animated width
// ✅ Full-screen video with object-cover
// ✅ FIXED: Uses new /api/hero/active endpoint

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getActiveHeroVideos } from "../services/heroService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PLACEHOLDER_IMAGE = "/placeholder-tour.jpg";

const HeroVideoCarousel = () => {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPoster, setShowPoster] = useState(true);

  const currentVideoRef = useRef(null);
  const nextVideoRef = useRef(null);
  const containerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const transitionTimeoutRef = useRef(null);

  // ── Check reduced motion ──────────────────────────────────────
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // ── Build video URL ────────────────────────────────────────────
  const getVideoUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/uploads/")) {
      const baseUrl = API_URL.replace(/\/api$/, '');
      return `${baseUrl}${path}`;
    }
    return `${API_URL.replace(/\/api$/, '')}${path}`;
  }, []);

  // ✅ FIXED: Fetch videos using new hero service
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getActiveHeroVideos();

        if (response.success && response.data && response.data.length > 0) {
          const processed = response.data.map((v) => ({
            ...v,
            heroVideo: {
              url: getVideoUrl(v.videoUrl),
              thumbnail: getVideoUrl(v.thumbnail),
            },
          }));
          setVideos(processed);
          
          if (processed.length > 1) {
            setNextIndex(1);
          }
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error("❌ Error fetching hero videos:", err);
        setError("Failed to load hero videos");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      mountedRef.current = false;
    };
  }, [getVideoUrl]);

  // ── Get current and next video ────────────────────────────────
  const currentVideo = useMemo(() => {
    return videos[currentIndex] || null;
  }, [videos, currentIndex]);

  const nextVideo = useMemo(() => {
    return videos[nextIndex] || null;
  }, [videos, nextIndex]);

  const currentUrl = currentVideo?.heroVideo?.url || null;
  const currentThumbnail = currentVideo?.heroVideo?.thumbnail || PLACEHOLDER_IMAGE;
  const nextUrl = nextVideo?.heroVideo?.url || null;
  const listingId = currentVideo?.listingId;
  const listingTitle = currentVideo?.listingTitle || currentVideo?.title || "Experience";

  // ── Handle current video playback ─────────────────────────────
  useEffect(() => {
    if (!currentVideoRef.current || !videos.length || prefersReducedMotion) return;

    const video = currentVideoRef.current;

    const handleCanPlay = () => {
      setVideoLoaded(true);
      setShowPoster(false);
      if (isPlaying && mountedRef.current) {
        video.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const handleError = () => {
      setVideoError(true);
    };

    const handleEnded = () => {
      if (mountedRef.current && isPlaying) {
        goToNext();
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    setVideoLoaded(false);
    setShowPoster(true);
    setVideoError(false);
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videos, currentIndex, isPlaying, prefersReducedMotion]);

  // ── Preload next video ─────────────────────────────────────────
  useEffect(() => {
    if (!nextVideoRef.current || !nextUrl || prefersReducedMotion) return;

    const video = nextVideoRef.current;
    const handleCanPlay = () => {};
    video.addEventListener("canplay", handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [nextUrl, prefersReducedMotion]);

  // ── Auto-rotation ──────────────────────────────────────────────
  useEffect(() => {
    if (!videos.length || !isPlaying || prefersReducedMotion || !videoLoaded || isTransitioning) {
      return;
    }

    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }

    const duration = (currentVideo?.heroVideo?.duration || 10) * 1000;
    const autoPlayDelay = Math.min(Math.max(duration, 5000), 15000);

    autoPlayTimerRef.current = setTimeout(() => {
      if (mountedRef.current && isPlaying && !isTransitioning) {
        goToNext();
      }
    }, autoPlayDelay);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [videos, currentIndex, isPlaying, videoLoaded, isTransitioning, prefersReducedMotion]);

  // ── Go to next ──────────────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (!videos.length || isTransitioning) return;
    
    const nextIdx = (currentIndex + 1) % videos.length;
    setIsTransitioning(true);
    
    setNextIndex((currentIndex + 2) % videos.length);
    setCurrentIndex(nextIdx);
    
    setVideoLoaded(false);
    setShowPoster(true);
    setVideoError(false);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 800);
  }, [videos.length, currentIndex, isTransitioning]);

  // ── Go to specific index ──────────────────────────────────────
  const goToIndex = useCallback((index) => {
    if (index === currentIndex || !videos.length || isTransitioning) return;
    setIsTransitioning(true);
    
    setNextIndex(currentIndex);
    setCurrentIndex(index);
    
    setVideoLoaded(false);
    setShowPoster(true);
    setVideoError(false);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 800);
  }, [currentIndex, videos.length, isTransitioning]);

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#F59E0B] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // ── No videos ──────────────────────────────────────────────────
  if (!videos.length || error) {
    return null;
  }

  // ── Video error fallback ────────────────────────────────────────
  if (videoError || !currentUrl) {
    return (
      <div className="absolute inset-0">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = PLACEHOLDER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-white/60" />
        </div>
      </div>
    );
  }

  // ── Reduced motion ──────────────────────────────────────────────
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // PREMIUM MAIN RENDER
  // ──────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      
      {/* ── Current Video ── */}
      <div
        className="absolute inset-0 transition-opacity duration-800 ease-in-out"
        style={{
          opacity: videoLoaded && !isTransitioning ? 1 : 1,
          zIndex: 1,
        }}
      >
        <video
          ref={currentVideoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          poster={showPoster ? currentThumbnail : undefined}
          preload="metadata"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        >
          <source src={currentUrl} type="video/mp4" />
          <source src={currentUrl.replace('.mp4', '.webm')} type="video/webm" />
          <track kind="captions" src="" label="English" />
        </video>

        {/* Poster overlay while loading */}
        {showPoster && !videoLoaded && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${currentThumbnail})` }}
          />
        )}

        {/* Loading overlay */}
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-white/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[#F59E0B] border-t-transparent animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* ── Next Video (preloaded, hidden) ── */}
      {nextUrl && (
        <video
          ref={nextVideoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <source src={nextUrl} type="video/mp4" />
          <source src={nextUrl.replace('.mp4', '.webm')} type="video/webm" />
        </video>
      )}

      {/* ── Cinematic Gradient Overlay ── */}
      <div 
        className="absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.55) 0%,
              rgba(0, 0, 0, 0.35) 40%,
              rgba(0, 0, 0, 0.65) 100%
            )
          `,
        }}
      />

      {/* ── Premium Indicator Dots ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
        {videos.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className="relative h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: isActive ? 32 : 8,
                backgroundColor: isActive ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                transition: 'width 0.5s ease-out, background-color 0.3s ease',
              }}
              aria-label={`Go to video ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HeroVideoCarousel;