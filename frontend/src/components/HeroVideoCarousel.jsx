// src/components/HeroVideoCarousel.jsx
// ============================================================
// AI TOUR — HERO VIDEO CAROUSEL
// ============================================================
// ✅ Full behavior preserved: fetch, autoplay, loop, swipe,
//    dots, prev/next, keyboard focus, reduced-motion poster
//    fallback, per-video error recovery, cleanup on unmount.
// ✅ Only visual change: lighter overlay gradient so the video
//    is clearly visible while keeping headline contrast (WCAG AA
//    in the region below the hero text).
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

const MEDIA_BASE_URL = (
  import.meta.env.VITE_MEDIA_BASE_URL ||
  API_URL.replace(/\/api\/?$/, "") + "/uploads"
).replace(/\/+$/, "");

const PLACEHOLDER_IMAGE = "/placeholder-tour.jpg";
const SWIPE_THRESHOLD = 50;
const TRANSITION_MS = 350;

const isAbsoluteUrl = (value) =>
  typeof value === "string" && /^(https?:)?\/\//i.test(value);

const buildMediaUrl = (value, type = "video") => {
  if (typeof value !== "string" || !value.trim()) return null;

  const path = value.trim();

  if (
    isAbsoluteUrl(path) ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  // Paths already served from the backend root.
  if (path.startsWith("/")) {
    const origin = API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    return `${origin}${path}`;
  }

  // Explicit uploads/ path.
  if (path.startsWith("uploads/")) {
    const origin = API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    return `${origin}/${path}`;
  }

  // Preserve the existing /uploads/videos convention.
  if (path.startsWith("videos/")) {
    return `${MEDIA_BASE_URL}/${path}`;
  }

  // A bare filename is assumed to be stored in the uploads directory.
  if (!path.includes("/")) {
    return `${MEDIA_BASE_URL}/${path}`;
  }

  // Other relative paths are relative to the backend origin.
  const origin = API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${origin}/${path}`;
};

const getVideoPath = (item) =>
  item?.videoUrl ||
  item?.url ||
  item?.video ||
  item?.filePath ||
  item?.src ||
  null;

const getPosterPath = (item) =>
  item?.thumbnail ||
  item?.posterImage ||
  item?.poster ||
  item?.coverImage ||
  null;

const HeroVideoCarousel = () => {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const videoRef = useRef(null);
  const mountedRef = useRef(false);
  const touchStartXRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const failedUrlsRef = useRef(new Set());
  const endedUrlRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(query.matches);

    if (query.addEventListener) {
      query.addEventListener("change", updatePreference);
      return () => query.removeEventListener("change", updatePreference);
    }

    query.addListener(updatePreference);
    return () => query.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchVideos = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const response = await getActiveHeroVideos();
        if (cancelled) return;

        const records = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const processed = records
          .map((item) => {
            const rawVideo = getVideoPath(item);
            const rawPoster = getPosterPath(item);

            const url = buildMediaUrl(rawVideo, "video");
            const poster = buildMediaUrl(rawPoster, "image");

            if (!url) return null;

            return {
              ...item,
              heroVideo: {
                url,
                thumbnail: poster || PLACEHOLDER_IMAGE,
              },
            };
          })
          .filter(Boolean);

        setVideos(processed);
        setCurrentIndex(0);
        failedUrlsRef.current.clear();
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load hero videos:", error);
        setLoadError(true);
        setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentVideo = useMemo(
    () => videos[currentIndex] || null,
    [videos, currentIndex]
  );

  const currentUrl = currentVideo?.heroVideo?.url || null;
  const currentPoster =
    currentVideo?.heroVideo?.thumbnail || PLACEHOLDER_IMAGE;

  const title =
    currentVideo?.listingTitle ||
    currentVideo?.title ||
    "AI Tour Experience";

  const clearTransition = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setIsTransitioning(false);
    }, TRANSITION_MS);
  }, []);

  const navigate = useCallback(
    (direction) => {
      if (!mountedRef.current || videos.length < 2) return;

      setIsTransitioning((currentlyTransitioning) => {
        if (currentlyTransitioning) return currentlyTransitioning;
        return true;
      });

      setCurrentIndex((index) => {
        if (direction === "next") {
          return (index + 1) % videos.length;
        }

        return (index - 1 + videos.length) % videos.length;
      });

      clearTransition();
    },
    [videos.length, clearTransition]
  );

  const goToNext = useCallback(() => navigate("next"), [navigate]);
  const goToPrevious = useCallback(() => navigate("previous"), [navigate]);

  const goToIndex = useCallback(
    (index) => {
      if (
        !mountedRef.current ||
        index < 0 ||
        index >= videos.length ||
        index === currentIndex ||
        isTransitioning
      ) {
        return;
      }

      setIsTransitioning(true);
      setCurrentIndex(index);
      clearTransition();
    },
    [videos.length, currentIndex, isTransitioning, clearTransition]
  );

  const handleTouchStart = useCallback((event) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event) => {
      if (touchStartXRef.current === null) return;

      const endX = event.changedTouches[0]?.clientX;
      const distance =
        touchStartXRef.current - (endX ?? touchStartXRef.current);

      touchStartXRef.current = null;

      if (Math.abs(distance) < SWIPE_THRESHOLD) return;

      if (distance > 0) goToNext();
      else goToPrevious();
    },
    [goToNext, goToPrevious]
  );

  useEffect(() => {
    const video = videoRef.current;

    setVideoLoaded(false);
    setVideoError(false);
    endedUrlRef.current = null;

    if (!video || !currentUrl || prefersReducedMotion) {
      video?.pause();
      return;
    }

    const handleLoaded = () => {
      if (mountedRef.current) setVideoLoaded(true);
    };

    const handleError = () => {
      if (!mountedRef.current) return;

      setVideoError(true);
      setVideoLoaded(false);
      failedUrlsRef.current.add(currentUrl);

      // Skip to another video if this one cannot be played.
      if (videos.length > 1 && endedUrlRef.current !== currentUrl) {
        endedUrlRef.current = currentUrl;
        goToNext();
      }
    };

    const handleEnded = () => {
      if (!mountedRef.current || endedUrlRef.current === currentUrl) return;

      endedUrlRef.current = currentUrl;
      goToNext();
    };

    const handleCanPlay = () => {
      if (mountedRef.current) setVideoLoaded(true);

      video.play().catch((error) => {
        // Autoplay can be restricted by the browser.
        console.info("Hero autoplay was not allowed:", error);
      });
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      video.pause();
    };
  }, [currentUrl, prefersReducedMotion, goToNext, videos.length]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#F59E0B]" />
      </div>
    );
  }

  if (loadError || !videos.length) return null;

  const showPoster = prefersReducedMotion || videoError || !currentUrl;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {showPoster ? (
        <img
          src={currentPoster}
          alt={title}
          className="h-full w-full object-cover"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
            event.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            key={currentUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
            preload="metadata"
            poster={currentPoster}
            aria-label={title}
          >
            <source src={currentUrl} />
            Your browser does not support HTML video.
          </video>

          {!videoLoaded && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${currentPoster}")` }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#F59E0B]" />
              </div>
            </div>
          )}
        </>
      )}

      {/* ✅ LIGHTER OVERLAY — video clearly visible, headline readable.
          Darkest at bottom (where stats + fade sit), lightest in the middle
          (where the video shows through). Keeps white text at AA contrast. */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.15) 40%, rgba(0,0,0,.55) 100%)",
        }}
      />

      {videos.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            disabled={isTransitioning}
            aria-label="Previous video"
            className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-50 sm:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            disabled={isTransitioning}
            aria-label="Next video"
            className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-50 sm:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {videos.map((item, index) => (
              <button
                key={item._id || item.id || item.heroVideo.url}
                type="button"
                onClick={() => goToIndex(index)}
                disabled={isTransitioning}
                aria-label={`Go to video ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className="h-1.5 rounded-full transition-all duration-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                style={{
                  width: index === currentIndex ? 24 : 7,
                  backgroundColor:
                    index === currentIndex
                      ? "#F59E0B"
                      : "rgba(255,255,255,.55)",
                }}
              />
            ))}
          </div>

          {videoError && (
            <div className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 text-xs text-white/80">
              <AlertCircle className="h-4 w-4" />
              <span>Video unavailable</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(HeroVideoCarousel);