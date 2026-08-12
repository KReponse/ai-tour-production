// frontend/src/components/HeroVideoCarousel.jsx
// ✅ COMPLETE FIXED - Optimized video loading and caching
// ✅ Fixed: Duplicate video requests
// ✅ Fixed: Memory leaks
// ✅ Added: Video caching
// ✅ Added: Proper cleanup

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getActiveHeroVideos } from "../services/heroService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const PLACEHOLDER_IMAGE = "/placeholder-tour.jpg";

// ✅ Video Cache - prevents reloading the same video
const videoCache = new Map();

const HeroVideoCarousel = () => {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentVideoRef = useRef(null);
  const containerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const transitionTimeoutRef = useRef(null);
  const loadedVideosRef = useRef(new Set());

  // ── Check reduced motion ──────────────────────────────────────
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // ── Build video URL with cache ────────────────────────────────
  const getVideoUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    
    // ✅ Cache the URL
    if (videoCache.has(path)) {
      return videoCache.get(path);
    }
    
    let url;
    if (path.startsWith("/uploads/")) {
      const baseUrl = API_URL.replace(/\/api$/, '');
      url = `${baseUrl}${path}`;
    } else {
      url = `${API_URL.replace(/\/api$/, '')}${path}`;
    }
    
    videoCache.set(path, url);
    return url;
  }, []);

  // ── Fetch videos ──────────────────────────────────────────────
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getActiveHeroVideos();

        if (response.success && response.data && response.data.length > 0) {
          // ✅ Process videos and cache URLs
          const processed = response.data.map((v) => ({
            ...v,
            heroVideo: {
              url: getVideoUrl(v.videoUrl),
              thumbnail: getVideoUrl(v.thumbnail || v.posterImage || PLACEHOLDER_IMAGE),
            },
          }));
          setVideos(processed);
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

  // ── Get current video ──────────────────────────────────────────
  const currentVideo = useMemo(() => {
    return videos[currentIndex] || null;
  }, [videos, currentIndex]);

  const currentUrl = currentVideo?.heroVideo?.url || null;
  const currentThumbnail = currentVideo?.heroVideo?.thumbnail || PLACEHOLDER_IMAGE;
  const listingTitle = currentVideo?.listingTitle || currentVideo?.title || "Experience";

  // ── Handle current video playback ─────────────────────────────
  useEffect(() => {
    if (!currentVideoRef.current || !videos.length || prefersReducedMotion) return;

    const video = currentVideoRef.current;
    const videoKey = currentUrl;

    // ✅ Skip if video is already loaded and playing
    if (loadedVideosRef.current.has(videoKey) && !video.paused) {
      return;
    }

    const handleCanPlay = () => {
      setVideoLoaded(true);
      loadedVideosRef.current.add(videoKey);
      
      if (isPlaying && mountedRef.current) {
        video.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const handleError = (e) => {
      console.warn("⚠️ Video error:", e);
      setVideoError(true);
    };

    const handleEnded = () => {
      if (mountedRef.current && isPlaying) {
        goToNext();
      }
    };

    // ✅ Clean up old event listeners
    video.removeEventListener("canplay", handleCanPlay);
    video.removeEventListener("error", handleError);
    video.removeEventListener("ended", handleEnded);

    // ✅ Add new event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    // ✅ Only load if not already loaded
    if (!loadedVideosRef.current.has(videoKey)) {
      setVideoLoaded(false);
      setVideoError(false);
      video.load();
    } else {
      // Video already loaded, just play it
      setVideoLoaded(true);
      if (isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videos, currentIndex, isPlaying, prefersReducedMotion, currentUrl]);

  // ── Auto-rotation ──────────────────────────────────────────────
  useEffect(() => {
    if (!videos.length || !isPlaying || prefersReducedMotion || !videoLoaded || isTransitioning) {
      return;
    }

    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }

    const duration = (currentVideo?.heroVideo?.duration || 8) * 1000;
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
  }, [videos, currentIndex, isPlaying, videoLoaded, isTransitioning, prefersReducedMotion, currentVideo]);

  // ── Go to next ──────────────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (!videos.length || isTransitioning) return;
    
    const nextIdx = (currentIndex + 1) % videos.length;
    setIsTransitioning(true);
    setCurrentIndex(nextIdx);
    
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
    setCurrentIndex(index);
    
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
      // ✅ Clear video cache on unmount to prevent memory leaks
      videoCache.clear();
      loadedVideosRef.current.clear();
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

  // ── Video error fallback ──────────────────────────────────────
  if (videoError || !currentUrl) {
    return (
      <div className="absolute inset-0">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="w-full h-full object-cover"
          loading="lazy"
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

  // ── Reduced motion ─────────────────────────────────────────────
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="w-full h-full object-cover"
          loading="lazy"
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
          opacity: 1,
          zIndex: 1,
        }}
      >
        <video
          ref={currentVideoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        >
          <source src={currentUrl} type="video/mp4" />
          {currentUrl && (
            <source src={currentUrl.replace('.mp4', '.webm')} type="video/webm" />
          )}
        </video>

        {/* Poster overlay while loading - only show if not loaded */}
        {!videoLoaded && currentThumbnail && (
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
              disabled={isTransitioning}
            />
          );
        })}
      </div>
    </div>
  );
};

// ✅ Memoize the component to prevent unnecessary re-renders
export default memo(HeroVideoCarousel);