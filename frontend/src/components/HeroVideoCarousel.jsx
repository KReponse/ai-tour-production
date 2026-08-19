// frontend/src/components/HeroVideoCarousel.jsx
// ============================================================
// AI Tour - Production Hero Video Carousel
// ============================================================
// Features:
// - Sequential playback
// - Last video loops back to first video
// - No competing autoplay timers
// - Prevents duplicate video requests
// - URL caching
// - Proper event listener cleanup
// - Handles autoplay restrictions
// - Reduced-motion support
// - Poster/thumbnail fallback
// - Video error recovery
// - Safe component unmounting
// - RESPONSIVE: Mobile-optimized indicators
// - RESPONSIVE: Touch swipe support
// ============================================================

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getActiveHeroVideos } from "../services/heroService";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PLACEHOLDER_IMAGE = "/placeholder-tour.jpg";

// Keep URL cache outside the component so re-renders do not recreate it.
const videoUrlCache = new Map();

/**
 * Check whether a value is already a complete URL.
 */
const isAbsoluteUrl = (value) => {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  );
};

/**
 * Build the frontend-accessible media URL.
 */
const buildMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;

  if (isAbsoluteUrl(mediaPath)) {
    return mediaPath;
  }

  if (videoUrlCache.has(mediaPath)) {
    return videoUrlCache.get(mediaPath);
  }

  const baseUrl = API_URL.replace(/\/api\/?$/, "");

  let url;

  if (mediaPath.startsWith("/")) {
    url = `${baseUrl}${mediaPath}`;
  } else {
    url = `${baseUrl}/${mediaPath}`;
  }

  videoUrlCache.set(mediaPath, url);

  return url;
};

const HeroVideoCarousel = () => {
  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(false);

  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // ✅ Touch swipe state
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const videoRef = useRef(null);
  const mountedRef = useRef(false);
  const lastEndedUrlRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const loadedVideosRef = useRef(new Set());
  const autoPlayTimeoutRef = useRef(null);

  // ----------------------------------------------------------
  // COMPONENT MOUNT / UNMOUNT
  // ----------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }

      loadedVideosRef.current.clear();
    };
  }, []);

  // ----------------------------------------------------------
  // REDUCED MOTION
  // ----------------------------------------------------------

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updatePreference = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  // ----------------------------------------------------------
  // FETCH HERO VIDEOS
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getActiveHeroVideos();

        if (cancelled) return;

        if (
          response?.success &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          const processedVideos = response.data
            .map((video) => {
              const videoUrl = buildMediaUrl(
                video.videoUrl ||
                  video.url ||
                  video.video
              );

              const thumbnailUrl = buildMediaUrl(
                video.thumbnail ||
                  video.posterImage ||
                  video.poster ||
                  null
              );

              if (!videoUrl) {
                return null;
              }

              return {
                ...video,

                heroVideo: {
                  url: videoUrl,
                  thumbnail:
                    thumbnailUrl || PLACEHOLDER_IMAGE,
                },
              };
            })
            .filter(Boolean);

          setVideos(processedVideos);

          // Always start from the first video when fresh data loads.
          setCurrentIndex(0);
        } else {
          setVideos([]);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "❌ Failed to load hero videos:",
          err
        );

        setError("Failed to load hero videos");
        setVideos([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // CURRENT VIDEO
  // ----------------------------------------------------------

  const currentVideo = useMemo(() => {
    if (!videos.length) return null;

    return videos[currentIndex] || videos[0];
  }, [videos, currentIndex]);

  const currentUrl =
    currentVideo?.heroVideo?.url || null;

  const currentThumbnail =
    currentVideo?.heroVideo?.thumbnail ||
    PLACEHOLDER_IMAGE;

  const listingTitle =
    currentVideo?.listingTitle ||
    currentVideo?.title ||
    "AI Tour Experience";

  // ----------------------------------------------------------
  // MOVE TO NEXT VIDEO
  // ----------------------------------------------------------

  const goToNext = useCallback(() => {
    if (!mountedRef.current) return;
    if (!videos.length) return;
    if (isTransitioning) return;

    setIsTransitioning(true);

    setCurrentIndex((previousIndex) => {
      const nextIndex =
        (previousIndex + 1) % videos.length;
      return nextIndex;
    });

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsTransitioning(false);
      }
    }, 500);
  }, [videos.length, isTransitioning]);

  // ----------------------------------------------------------
  // GO TO PREVIOUS VIDEO
  // ----------------------------------------------------------

  const goToPrevious = useCallback(() => {
    if (!mountedRef.current) return;
    if (!videos.length) return;
    if (isTransitioning) return;

    setIsTransitioning(true);

    setCurrentIndex((previousIndex) => {
      const nextIndex =
        previousIndex === 0 
          ? videos.length - 1 
          : previousIndex - 1;
      return nextIndex;
    });

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsTransitioning(false);
      }
    }, 500);
  }, [videos.length, isTransitioning]);

  // ----------------------------------------------------------
  // GO TO SPECIFIC VIDEO
  // ----------------------------------------------------------

  const goToIndex = useCallback(
    (index) => {
      if (!mountedRef.current) return;
      if (!videos.length) return;
      if (index < 0 || index >= videos.length) return;
      if (index === currentIndex) return;
      if (isTransitioning) return;

      setIsTransitioning(true);
      setCurrentIndex(index);

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      transitionTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsTransitioning(false);
        }
      }, 500);
    },
    [
      currentIndex,
      videos.length,
      isTransitioning,
    ]
  );

  // ----------------------------------------------------------
  // TOUCH SWIPE HANDLERS
  // ----------------------------------------------------------

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchEndX(touch.clientX);
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    setTouchEndX(touch.clientX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const swipeDistance = touchStartX - touchEndX;
    const minSwipeDistance = 50; // Minimum distance for swipe

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe left → next video
        goToNext();
      } else {
        // Swipe right → previous video
        goToPrevious();
      }
    }

    setTouchStartX(0);
    setTouchEndX(0);
  }, [isSwiping, touchStartX, touchEndX, goToNext, goToPrevious]);

  // ----------------------------------------------------------
  // VIDEO EVENT HANDLERS
  // ----------------------------------------------------------

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !currentUrl) return;

    // Reset state for new video.
    setVideoLoaded(false);
    setVideoError(false);

    lastEndedUrlRef.current = null;

    const handleLoadedData = () => {
      if (!mountedRef.current) return;

      setVideoLoaded(true);
      setVideoError(false);

      loadedVideosRef.current.add(currentUrl);
    };

    const handleCanPlay = () => {
      if (!mountedRef.current) return;

      setVideoLoaded(true);
      setVideoError(false);

      loadedVideosRef.current.add(currentUrl);

      if (!prefersReducedMotion && isPlaying) {
        video
          .play()
          .catch((playError) => {
            console.warn(
              "⚠️ Browser blocked autoplay:",
              playError
            );

            if (mountedRef.current) {
              setIsPlaying(false);
            }
          });
      }
    };

    const handlePlay = () => {
      if (mountedRef.current) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (mountedRef.current) {
        setIsPlaying(false);
      }
    };

    const handleError = (event) => {
      console.warn(
        "⚠️ Hero video playback error:",
        event
      );

      if (mountedRef.current) {
        setVideoError(true);
        setVideoLoaded(false);
      }
    };

    const handleEnded = () => {
      if (!mountedRef.current) return;

      // Prevent duplicate ended events.
      if (lastEndedUrlRef.current === currentUrl) {
        return;
      }

      lastEndedUrlRef.current = currentUrl;

      goToNext();
    };

    video.addEventListener(
      "loadeddata",
      handleLoadedData
    );

    video.addEventListener(
      "canplay",
      handleCanPlay
    );

    video.addEventListener("play", handlePlay);

    video.addEventListener("pause", handlePause);

    video.addEventListener(
      "error",
      handleError
    );

    video.addEventListener(
      "ended",
      handleEnded
    );

    /**
     * If this video was already loaded by the browser,
     * don't unnecessarily reload it.
     */
    if (loadedVideosRef.current.has(currentUrl)) {
      setVideoLoaded(true);

      if (!prefersReducedMotion && isPlaying) {
        video.play().catch(() => {});
      }
    } else {
      video.load();
    }

    return () => {
      video.removeEventListener(
        "loadeddata",
        handleLoadedData
      );

      video.removeEventListener(
        "canplay",
        handleCanPlay
      );

      video.removeEventListener(
        "play",
        handlePlay
      );

      video.removeEventListener(
        "pause",
        handlePause
      );

      video.removeEventListener(
        "error",
        handleError
      );

      video.removeEventListener(
        "ended",
        handleEnded
      );

      video.pause();
    };
  }, [
    currentUrl,
    goToNext,
    isPlaying,
    prefersReducedMotion,
  ]);

  // ----------------------------------------------------------
  // PLAY / PAUSE WHEN REDUCED MOTION CHANGES
  // ----------------------------------------------------------

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !currentUrl) return;

    if (prefersReducedMotion) {
      video.pause();
      return;
    }

    if (isPlaying && videoLoaded) {
      video.play().catch(() => {});
    }
  }, [
    prefersReducedMotion,
    isPlaying,
    videoLoaded,
    currentUrl,
  ]);

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div className="relative h-12 w-12 sm:h-14 sm:w-14">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#F59E0B] border-t-transparent" />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // EMPTY / API ERROR
  // ----------------------------------------------------------

  if (!videos.length || error) {
    return null;
  }

  // ----------------------------------------------------------
  // REDUCED MOTION
  // ----------------------------------------------------------

  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="h-full w-full object-cover"
          loading="eager"
          onError={(event) => {
            event.currentTarget.src =
              PLACEHOLDER_IMAGE;
          }}
        />

        <div className="absolute inset-0 bg-black/45" />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.30) 40%, rgba(0,0,0,.65) 100%)",
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------------
  // VIDEO ERROR FALLBACK
  // ----------------------------------------------------------

  if (videoError || !currentUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={currentThumbnail}
          alt={listingTitle}
          className="h-full w-full object-cover"
          loading="eager"
          onError={(event) => {
            event.currentTarget.src =
              PLACEHOLDER_IMAGE;
          }}
        />

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white/60" />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // PREMIUM HERO VIDEO
  // ----------------------------------------------------------

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ------------------------------------------------------
          VIDEO
      ------------------------------------------------------ */}

      <div
        className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity: 1,
          zIndex: 1,
        }}
      >
        <video
          ref={videoRef}
          key={currentUrl}
          className="h-full w-full object-cover"
          muted
          autoPlay
          playsInline
          preload="metadata"
          poster={currentThumbnail}
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
        >
          <source
            src={currentUrl}
            type={
              currentUrl
                .toLowerCase()
                .includes(".webm")
                ? "video/webm"
                : "video/mp4"
            }
          />

          Your browser does not support HTML5 video.
        </video>

        {/* ----------------------------------------------------
            POSTER WHILE VIDEO LOADS
        ---------------------------------------------------- */}

        {!videoLoaded && currentThumbnail && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${currentThumbnail}")`,
            }}
          />
        )}

        {/* ----------------------------------------------------
            LOADING INDICATOR
        ---------------------------------------------------- */}

        {!videoLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12">
              <div className="absolute inset-0 rounded-full border-4 border-white/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#F59E0B] border-t-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------
          CINEMATIC GRADIENT
      ------------------------------------------------------ */}

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.55) 0%,
              rgba(0, 0, 0, 0.30) 40%,
              rgba(0, 0, 0, 0.70) 100%
            )
          `,
        }}
      />

      {/* ------------------------------------------------------
          NAVIGATION ARROWS (Desktop only)
      ------------------------------------------------------ */}

      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className={`
              absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20
              hidden sm:flex items-center justify-center
              w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12
              rounded-full bg-black/30 backdrop-blur-sm
              text-white hover:bg-black/50
              transition-all duration-300
              hover:scale-110
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label="Previous video"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>

          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className={`
              absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20
              hidden sm:flex items-center justify-center
              w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12
              rounded-full bg-black/30 backdrop-blur-sm
              text-white hover:bg-black/50
              transition-all duration-300
              hover:scale-110
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label="Next video"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* ------------------------------------------------------
          VIDEO INDICATORS - Responsive
      ------------------------------------------------------ */}

      {videos.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:gap-2 md:gap-2.5">
          {videos.map((video, index) => {
            const isActive = index === currentIndex;

            return (
              <button
                key={
                  video._id ||
                  video.id ||
                  video.heroVideo?.url ||
                  index
                }
                type="button"
                onClick={() => goToIndex(index)}
                disabled={isTransitioning}
                aria-label={`Go to video ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                className="relative h-1.5 sm:h-2 rounded-full outline-none transition-all duration-500 ease-out disabled:cursor-not-allowed focus:ring-2 focus:ring-[#F59E0B]/50"
                style={{
                  width: isActive ? 24 : 6,
                  minWidth: isActive ? 24 : 6,
                  height: 6,
                  backgroundColor: isActive
                    ? "#F59E0B"
                    : "rgba(255,255,255,0.4)",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------
          SWIPE INDICATOR (Mobile)
      ------------------------------------------------------ */}

      {videos.length > 1 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none sm:hidden">
          <div className="flex items-center gap-4 text-white/20">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-xs font-medium">Swipe</span>
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(HeroVideoCarousel);