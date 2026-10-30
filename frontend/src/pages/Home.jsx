// src/pages/Home.jsx
// ============================================================
// AI TOUR — PREMIUM HOMEPAGE (Hero Motion + Real Stats)
// ============================================================
// ✅ Framer Motion on hero text only
// ✅ Real stats section below hero (no invented numbers)
// ✅ Infinite scroll, pagination, reviews, quick actions,
//    AI banner, dark mode, BackToTop — all preserved
// ✅ prefers-reduced-motion fully respected
// ============================================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles, Star, ArrowRight, Bot, Compass, Globe, Route,
  MessageCircle, Search, Heart, MapPin, Clock, Users, Loader2,
  Play, Flame, Calendar, User, Quote, Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import MediaCard from '../components/ui/MediaCard';
import HeroVideoCarousel from '../components/HeroVideoCarousel';
import { getListings } from '../services/listingService';
import { getPublicReviews } from '../services/reviewService';
import {
  getImageUrl,
  getCoverMedia,
  getCoverMediaType,
  getCoverVideo,
} from '../utils/mediaHelpers';
import { getActiveHeroVideos } from '../services/heroService';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import useScrollPosition from '../hooks/useScrollPosition';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import BackToTop from '../components/ui/BackToTop';
import { PAGINATION } from '../utils/constants';

import Heroimg from '../assets/images/heroimg.png';

// ── Constants ────────────────────────────────────────────────

const PLACEHOLDER_IMAGE = '/placeholder-tour.jpg';
const TEAL = '#0D9488';
const GOLD = '#F59E0B';
const EASE_PREMIUM = [0.22, 1, 0.36, 1];

const quickActions = [
  { title: 'Explore', icon: Compass, link: '/explore', color: '#0D9488' },
  { title: 'AI Planner', icon: Sparkles, link: '/ai-planner', color: '#F59E0B' },
  { title: 'Trips', icon: Route, link: '/trips', color: '#374151' },
  { title: 'Reviews', icon: MessageCircle, link: '/reviews', color: '#0D9488' },
];

// ================================================================
// REVIEW CARD
// ================================================================

const ReviewCard = ({ review }) => {
  const name =
    review.user?.name ||
    review.traveler?.name ||
    'Anonymous Traveler';

  const avatar =
    review.user?.profileImage ||
    review.traveler?.profileImage ||
    null;

  const rating = review.rating || 0;

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const styles = {
    card: {
      background: 'var(--card-bg, #fff)',
      borderRadius: 20,
      border: '1.5px solid var(--border-color, #F3F4F6)',
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'box-shadow .25s, border-color .25s, transform .25s',
      cursor: 'default',
    },
    quote: {
      color: 'var(--quote-color, #0D948825)',
      fontSize: 32,
      lineHeight: 1,
      fontFamily: 'Georgia, serif',
      fontWeight: 900,
    },
    comment: {
      fontSize: 13.5,
      color: 'var(--text-secondary, #4B5563)',
      lineHeight: 1.75,
      flex: 1,
      margin: 0,
      display: '-webkit-box',
      WebkitLineClamp: 4,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    listing: {
      fontSize: 11,
      color: 'var(--text-muted, #9CA3AF)',
      margin: 0,
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingTop: 12,
      borderTop: '1px solid var(--border-color, #F3F4F6)',
    },
    name: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--text-primary, #374151)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  };

  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          '0 8px 32px rgba(13,148,136,.12)';
        e.currentTarget.style.borderColor = `${TEAL}30`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor =
          'var(--border-color, #F3F4F6)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={styles.quote}>"</div>

      <p style={styles.comment}>
        {review.comment || review.text || 'No comment provided.'}
      </p>

      {review.listing && (
        <p style={styles.listing}>
          on {review.listing.title || review.listing}
        </p>
      )}

      <div style={styles.divider}>
        {avatar ? (
          <img
            src={getImageUrl(avatar)}
            alt={name}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
            onError={(e) =>
              (e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                name
              )}&background=0D9488&color=fff&size=48`)
            }
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${TEAL}, ${GOLD})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.name}>{name}</div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}
          >
            <div style={{ display: 'flex', gap: 1 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width={11}
                  height={11}
                  viewBox="0 0 24 24"
                  fill={s <= rating ? GOLD : '#E5E7EB'}
                >
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              ))}
            </div>

            {date && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted, #9CA3AF)',
                }}
              >
                {date}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// HOME
// ================================================================

const Home = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalTravelers: 0,
    totalExperiences: 0,
    totalReviews: 0,
  });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [search, setSearch] = useState('');
  const [heroError, setHeroError] = useState(false);
  const [hasHeroVideos, setHasHeroVideos] = useState(true);

  const { restoreScrollPosition } = useScrollPosition('home-scroll');

  const {
    items: experiences,
    loading,
    loadingMore,
    error,
    hasMore,
    showLoadMore,
    loadMore,
    refresh,
    sentinelRef,
    isEmpty,
  } = useInfiniteScroll({
    fetchFn: getListings,
    initialParams: { limit: PAGINATION.DEFAULT_LIMIT },
    dataKey: 'listings',
    loadMoreAfterPages: PAGINATION.LOAD_MORE_PAGES_BEFORE_BUTTON,
  });

  // Fetch reviews
  useEffect(() => {
    (async () => {
      try {
        setLoadingReviews(true);

        const data = await getPublicReviews({
          limit: 6,
          sort: 'latest',
        });

        const list =
          data.success && data.reviews
            ? data.reviews
            : Array.isArray(data)
              ? data
              : data.data && Array.isArray(data.data)
                ? data.data
                : [];

        setReviews(
          list.filter((r) => r.status === 'approved' || !r.status)
        );
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    })();
  }, []);

  // Stats — derived from data currently loaded only
  useEffect(() => {
    const t = experiences.reduce(
      (a, e) => a + (e.totalBookings || 0),
      0
    );

    setStats({
      totalTravelers: t,
      totalExperiences: experiences.length,
      totalReviews: reviews.length,
    });
  }, [experiences, reviews]);

  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  // Hero videos metadata
  useEffect(() => {
    (async () => {
      try {
        const response = await getActiveHeroVideos();
        setHasHeroVideos(
          response.success && response.data?.length > 0
        );
      } catch (err) {
        console.error('❌ Failed to load hero videos:', err);
        setHasHeroVideos(false);
      }
    })();
  }, []);

  const handleSearch = useCallback(() => {
    navigate(
      search.trim()
        ? `/explore?search=${encodeURIComponent(search)}`
        : '/explore'
    );
  }, [search, navigate]);

  // Poster image for video covers
  const getListingImage = (listing) => {
    const coverType = getCoverMediaType(listing);

    if (coverType === 'video') {
      const explicitPoster =
        listing.coverImage ||
        listing.thumbnailUrl ||
        listing.thumbnail;

      if (explicitPoster) return getImageUrl(explicitPoster);

      const gallery = Array.isArray(listing.galleryImages)
        ? listing.galleryImages
        : [];

      const firstImage = gallery.find((item) => {
        const url =
          typeof item === 'string'
            ? item
            : item?.url || item?.src || '';

        return (
          url &&
          !/\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(String(url))
        );
      });

      if (firstImage) {
        const url =
          typeof firstImage === 'string'
            ? firstImage
            : firstImage.url || firstImage.src;

        return getImageUrl(url);
      }

      return PLACEHOLDER_IMAGE;
    }

    const cover = getCoverMedia(listing);
    return cover ? getImageUrl(cover) : PLACEHOLDER_IMAGE;
  };

  const trendingExperiences = useMemo(
    () =>
      [...experiences]
        .filter((e) => e.status === 'approved')
        .sort((a, b) => {
          const rd =
            (b.averageRating || 0) - (a.averageRating || 0);

          return rd !== 0
            ? rd
            : (b.totalBookings || 0) - (a.totalBookings || 0);
        })
        .slice(0, 12),
    [experiences]
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .hero-card { transition: box-shadow .3s; }
        .hero-card:hover { box-shadow: 0 24px 60px rgba(0,0,0,.24)!important; }

        .qa-card { transition: box-shadow .25s, transform .25s, background .25s; }
        .qa-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,.1); }

        .exp-card-wrap { transition: transform .3s, box-shadow .3s; }
        .exp-card-wrap:hover { transform: translateY(-5px); }

        input:focus { outline: none; }
        * { box-sizing: border-box; }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .quick-actions-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }

        .hero-section {
          position: relative;
          width: 100%;
          min-height: 520px;
          overflow: hidden;
          border-radius: 16px;
          margin-bottom: 0;
          isolation: isolate;
        }
        @media (min-width: 640px) {
          .hero-section { min-height: 600px; border-radius: 24px; }
        }
        @media (min-width: 1024px) {
          .hero-section { min-height: 660px; border-radius: 28px; }
        }

        .trending-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .trending-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
        @media (min-width: 1024px) {
          .trending-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
        }
        @media (min-width: 1280px) {
          .trending-grid { grid-template-columns: repeat(6, 1fr); gap: 14px; }
        }

        :root {
          --bg-body: #F8FAFC;
          --card-bg: #ffffff;
          --border-color: #F3F4F6;
          --text-primary: #374151;
          --text-secondary: #4B5563;
          --text-muted: #9CA3AF;
          --quote-color: #0D948825;
        }
        .dark {
          --bg-body: #0F172A;
          --card-bg: #1E293B;
          --border-color: #334155;
          --text-primary: #F1F5F9;
          --text-secondary: #94A3B8;
          --text-muted: #64748B;
          --quote-color: #0D948840;
        }
        body { background: var(--bg-body); color: var(--text-primary); }

        .home-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }
        @media (min-width: 640px) { .home-container { padding: 0 20px; } }
        @media (min-width: 1024px) { .home-container { padding: 0 20px; } }

        .ai-focus:focus-visible {
          outline: 3px solid #0D9488;
          outline-offset: 2px;
        }
      `}</style>

      <div
        style={{
          fontFamily: "'Inter','Segoe UI',sans-serif",
          background: 'var(--bg-body)',
          minHeight: '100vh',
          transition: 'background .3s ease',
          overflowX: 'hidden',
        }}
      >
        {/* ============================================================
            PREMIUM HERO
        ============================================================ */}
        <section className="hero-section">
          {hasHeroVideos ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <HeroVideoCarousel />
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <img
                src={heroError ? PLACEHOLDER_IMAGE : Heroimg}
                alt="AI Tour Rwanda"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={() => setHeroError(true)}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.65) 100%)',
                }}
              />
            </div>
          )}

          {/* Hero content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'inherit',
              padding: 'clamp(32px, 6vw, 72px) clamp(16px, 4vw, 32px)',
              textAlign: 'center',
            }}
          >
            {/* Badge */}
            <motion.div
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: 12, scale: 0.96 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.55,
                ease: EASE_PREMIUM,
                delay: 0.05,
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,.14)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,.28)',
                borderRadius: 999,
                padding: '7px 16px',
                marginBottom: 20,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                boxShadow: '0 4px 24px rgba(0,0,0,.15)',
              }}
            >
              <motion.span
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { rotate: [0, 8, -4, 0], scale: [1, 1.12, 1] }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: 'easeInOut',
                }}
                style={{ display: 'inline-flex' }}
              >
                <Sparkles size={13} style={{ color: GOLD }} />
              </motion.span>
              AI-Powered Tourism
            </motion.div>

            {/* Headline */}
            <h1
              style={{
                maxWidth: 820,
                fontSize: 'clamp(32px, 5.4vw, 74px)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.05,
                marginBottom: 16,
                letterSpacing: '-0.025em',
                textShadow: '0 2px 24px rgba(0,0,0,.45)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                columnGap: '0.28em',
                rowGap: '0.05em',
              }}
            >
              {['Discover', 'Rwanda'].map((word, i) => (
                <motion.span
                  key={word}
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 24 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: EASE_PREMIUM,
                    delay: 0.15 + i * 0.1,
                  }}
                  style={{ display: 'inline-block' }}
                >
                  {word}
                </motion.span>
              ))}

              <motion.span
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 24, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.85,
                  ease: EASE_PREMIUM,
                  delay: 0.35,
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  color: GOLD,
                  fontStyle: 'italic',
                  background: `linear-gradient(90deg, ${GOLD} 0%, #FBBF24 50%, ${GOLD} 100%)`,
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginTop: '0.06em',
                }}
              >
                with AI Tour
              </motion.span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={
                prefersReducedMotion ? false : { opacity: 0, y: 16 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: EASE_PREMIUM,
                delay: 0.5,
              }}
              style={{
                maxWidth: 600,
                fontSize: 'clamp(14px, 1.55vw, 17.5px)',
                color: 'rgba(255,255,255,.9)',
                lineHeight: 1.7,
                marginBottom: 32,
                fontWeight: 400,
                textShadow: '0 1px 10px rgba(0,0,0,.4)',
                padding: '0 8px',
              }}
            >
              Smart travel planning powered by artificial intelligence.
              <span style={{ display: 'block', marginTop: 2, opacity: 0.9 }}>
                Personalized experiences across Rwanda and beyond.
              </span>
            </motion.p>

            {/* Search card */}
            <motion.div
              className="hero-card ai-focus"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.75,
                ease: EASE_PREMIUM,
                delay: 0.65,
              }}
              style={{
                width: '100%',
                maxWidth: 640,
                background: 'rgba(255,255,255,.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 20,
                padding: 10,
                boxShadow:
                  '0 20px 60px rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.4)',
                display: 'flex',
                gap: 8,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#F1F5F9',
                  borderRadius: 12,
                  padding: '0 12px',
                }}
              >
                <Search size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search experiences, locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="ai-focus"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '100%',
                    fontSize: 'clamp(13px, 1.2vw, 14px)',
                    color: '#374151',
                    height: 46,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <motion.button
                onClick={handleSearch}
                className="ai-focus"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                  height: 46,
                  padding: '0 20px',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${TEAL} 0%, #0f766e 100%)`,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 'clamp(13px, 1.1vw, 14px)',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 4px 16px ${TEAL}50`,
                  fontFamily: 'inherit',
                }}
              >
                Explore Now
              </motion.button>
            </motion.div>

            {/* Stats row inside hero (only shown when there is data) */}
            {(stats.totalTravelers > 0 ||
              stats.totalExperiences > 0 ||
              stats.totalReviews > 0) && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: EASE_PREMIUM,
                  delay: 0.85,
                }}
                style={{
                  display: 'flex',
                  gap: 20,
                  marginTop: 26,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {[
                  {
                    emoji: '⭐',
                    value: stats.totalTravelers,
                    label: 'Travelers',
                  },
                  {
                    emoji: '🌍',
                    value: stats.totalExperiences,
                    label: 'Experiences',
                  },
                  {
                    emoji: '💬',
                    value: stats.totalReviews,
                    label: 'Reviews',
                  },
                ]
                  .filter(({ value }) => value > 0)
                  .map(({ emoji, value, label }, idx) => (
                    <motion.span
                      key={label}
                      initial={
                        prefersReducedMotion ? false : { opacity: 0, y: 6 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: 'easeOut',
                        delay: 0.9 + idx * 0.08,
                      }}
                      style={{
                        fontSize: 'clamp(11px, 1.1vw, 13px)',
                        color: 'rgba(255,255,255,.92)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        textShadow: '0 1px 8px rgba(0,0,0,.4)',
                      }}
                    >
                      {emoji} {value.toLocaleString()}+ {label}
                    </motion.span>
                  ))}
              </motion.div>
            )}
          </div>

          {/* Bottom fade */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              zIndex: 11,
              background:
                'linear-gradient(to bottom, transparent, var(--bg-body))',
              pointerEvents: 'none',
            }}
          />
        </section>

        {/* ============================================================
            REAL STATS — below hero (only shows counts that exist)
        ============================================================ */}
        {(stats.totalExperiences > 0 || stats.totalReviews > 0) && (
          <section
            aria-label="AI Tour highlights"
            style={{
              maxWidth: 1040,
              margin: '0 auto',
              padding: '22px 16px 8px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  icon: '🌍',
                  count: stats.totalExperiences,
                  label: 'Experiences loaded',
                },
                {
                  icon: '💬',
                  count: stats.totalReviews,
                  label: 'Community reviews',
                },
              ]
                .filter(({ count }) => count > 0)
                .map(({ icon, count, label }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      minHeight: 76,
                      padding: '14px 12px',
                      border: '1px solid var(--border-color, #E5E7EB)',
                      borderRadius: 16,
                      background: 'var(--card-bg, #FFFFFF)',
                      color: 'var(--text-primary, #374151)',
                      boxShadow: '0 4px 18px rgba(55,65,81,.04)',
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 22 }}>
                      {icon}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 18,
                          lineHeight: 1.15,
                          color: TEAL,
                        }}
                      >
                        {count.toLocaleString()}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary, #6B7280)',
                        }}
                      >
                        {label}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ============================================================
            REST OF PAGE
        ============================================================ */}
        <div className="home-container">
          {/* QUICK ACTIONS */}
          <section style={{ marginTop: 36, marginBottom: 48 }}>
            <div className="quick-actions-grid">
              {quickActions.map(({ title, icon: Icon, link, color }) => (
                <Link key={link} to={link} style={{ textDecoration: 'none' }}>
                  <div
                    className="qa-card"
                    style={{
                      background: 'var(--card-bg, #fff)',
                      borderRadius: 16,
                      border: '1.5px solid var(--border-color, #F3F4F6)',
                      padding: '18px 12px',
                      textAlign: 'center',
                      transition:
                        'box-shadow .25s, transform .25s, background .25s, border-color .25s',
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        margin: '0 auto 12px',
                        background: `${color}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={22} color={color} />
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(12px, 1.2vw, 14px)',
                        fontWeight: 700,
                        color: 'var(--text-primary, #374151)',
                      }}
                    >
                      {title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* TRENDING EXPERIENCES */}
          <section id="trending-section" style={{ marginBottom: 56 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 22,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${GOLD}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Flame size={15} color={GOLD} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: GOLD,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                    }}
                  >
                    Trending
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(22px, 2.8vw, 32px)',
                    fontWeight: 900,
                    color: 'var(--text-primary, #111827)',
                    margin: 0,
                    letterSpacing: '-.02em',
                  }}
                >
                  Trending Adventures
                </h2>
                <p
                  style={{
                    fontSize: 'clamp(12px, 1.1vw, 14px)',
                    color: 'var(--text-secondary, #6B7280)',
                    margin: '6px 0 0',
                  }}
                >
                  Experiences loved by travelers right now
                </p>
              </div>
              <Link
                to="/explore"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 'clamp(12px, 1vw, 13px)',
                  fontWeight: 700,
                  color: TEAL,
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${TEAL}25`,
                  background: `${TEAL}08`,
                  transition: 'all .2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = TEAL;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${TEAL}08`;
                  e.currentTarget.style.color = TEAL;
                }}
              >
                View All <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <LoadingSkeleton
                count={6}
                type="grid"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4"
              />
            ) : trendingExperiences.length === 0 ? (
              <div
                style={{
                  background: 'var(--card-bg, #fff)',
                  borderRadius: 20,
                  border: '1.5px solid var(--border-color, #F3F4F6)',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: `${TEAL}10`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Compass size={28} color={TEAL} />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--text-primary, #374151)',
                    margin: '0 0 6px',
                  }}
                >
                  No Experiences Yet
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted, #9CA3AF)',
                    margin: 0,
                  }}
                >
                  Check back soon for trending adventures.
                </p>
              </div>
            ) : (
              <div>
                <div className="trending-grid">
                  {trendingExperiences.map((listing) => {
                    const coverType = getCoverMediaType(listing);
                    const videoUrl =
                      coverType === 'video'
                        ? getCoverVideo(listing)
                        : null;
                    const posterImage = getListingImage(listing);

                    return (
                      <div key={listing._id} className="exp-card-wrap">
                        <MediaCard
                          id={listing._id}
                          title={listing.title}
                          image={posterImage}
                          location={listing.location}
                          price={listing.price}
                          duration={listing.duration}
                          rating={listing.averageRating || 0}
                          type="experience"
                          coverMediaType={coverType}
                          videoUrl={videoUrl}
                          onSelect={(id) =>
                            navigate(`/listing/${id}`, {
                              state: { coverMediaType: coverType },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {!isEmpty && hasMore && (
                  <div
                    ref={sentinelRef}
                    style={{
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 12,
                    }}
                  >
                    {loadingMore && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--text-muted, #9CA3AF)',
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            border: `2px solid ${TEAL}`,
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin .8s linear infinite',
                          }}
                        />
                        Loading more...
                      </div>
                    )}
                  </div>
                )}

                {showLoadMore && hasMore && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      marginTop: 22,
                    }}
                  >
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="ai-focus"
                      style={{
                        padding: '12px 26px',
                        borderRadius: 12,
                        border: 'none',
                        background: loadingMore
                          ? 'var(--border-color, #E5E7EB)'
                          : TEAL,
                        color: loadingMore
                          ? 'var(--text-muted, #9CA3AF)'
                          : '#fff',
                        fontWeight: 600,
                        fontSize: 'clamp(12px, 1vw, 14px)',
                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                        transition: 'all .2s',
                      }}
                    >
                      {loadingMore ? (
                        <>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              border: '2px solid #fff',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin .8s linear infinite',
                            }}
                          />{' '}
                          Loading...
                        </>
                      ) : (
                        'Load More Experiences'
                      )}
                    </button>
                  </div>
                )}

                {!hasMore && trendingExperiences.length > 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      paddingTop: 14,
                      fontSize: 12,
                      color: 'var(--text-muted, #9CA3AF)',
                    }}
                  >
                    You've seen all trending experiences 🎉
                  </div>
                )}

                {error && (
                  <div style={{ textAlign: 'center', paddingTop: 22 }}>
                    <p
                      style={{
                        color: '#EF4444',
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      {error}
                    </p>
                    <button
                      onClick={refresh}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 10,
                        border: 'none',
                        background: TEAL,
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 30,
                  }}
                >
                  <Link to="/explore" style={{ textDecoration: 'none' }}>
                    <button
                      className="ai-focus"
                      style={{
                        padding: '13px 30px',
                        borderRadius: 14,
                        border: 'none',
                        background: `linear-gradient(135deg, ${TEAL} 0%, ${GOLD} 100%)`,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 'clamp(13px, 1.1vw, 15px)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: `0 6px 24px ${TEAL}40`,
                        fontFamily: 'inherit',
                        transition: 'transform .2s, box-shadow .2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)';
                        e.currentTarget.style.boxShadow = `0 10px 32px ${TEAL}50`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 6px 24px ${TEAL}40`;
                      }}
                    >
                      View All Listings <ArrowRight size={16} />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </section>

          <div
            style={{
              height: 1,
              background:
                'linear-gradient(to right, transparent, var(--border-color, #E5E7EB), transparent)',
              marginBottom: 48,
            }}
          />

          {/* AI BANNER */}
          <section
            style={{
              marginBottom: 56,
              borderRadius: 24,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${TEAL} 0%, #0f766e 40%, ${GOLD} 100%)`,
                padding: 'clamp(36px, 5vw, 56px) 24px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.08)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -50,
                  left: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.05)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,.18)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Bot size={24} color="#fff" />
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(22px, 3.5vw, 36px)',
                    fontWeight: 900,
                    color: '#fff',
                    margin: '0 0 12px',
                    letterSpacing: '-.02em',
                  }}
                >
                  Meet Your AI Travel Assistant
                </h2>
                <p
                  style={{
                    maxWidth: 500,
                    margin: '0 auto 26px',
                    fontSize: 'clamp(13px, 1.2vw, 15px)',
                    color: 'rgba(255,255,255,.9)',
                    lineHeight: 1.7,
                    padding: '0 8px',
                  }}
                >
                  Get personalized itineraries and smart recommendations
                  tailored to your interests.
                </p>
                <Link to="/ai-planner" style={{ textDecoration: 'none' }}>
                  <button
                    className="ai-focus"
                    style={{
                      padding: '13px 30px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#fff',
                      color: TEAL,
                      fontWeight: 700,
                      fontSize: 'clamp(13px, 1.1vw, 15px)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 6px 20px rgba(0,0,0,.15)',
                      fontFamily: 'inherit',
                      transition: 'transform .2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Start Planning <Sparkles size={14} color={GOLD} />
                  </button>
                </Link>
              </div>
            </div>
          </section>

          {/* COMMUNITY REVIEWS */}
          <section style={{ marginBottom: 56 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 22,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${TEAL}12`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageCircle size={14} color={TEAL} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: TEAL,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                    }}
                  >
                    Community
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(22px, 2.8vw, 32px)',
                    fontWeight: 900,
                    color: 'var(--text-primary, #111827)',
                    margin: 0,
                    letterSpacing: '-.02em',
                  }}
                >
                  What Travelers Say
                </h2>
                <p
                  style={{
                    fontSize: 'clamp(12px, 1.1vw, 14px)',
                    color: 'var(--text-secondary, #6B7280)',
                    margin: '6px 0 0',
                  }}
                >
                  Real experiences from our community
                </p>
              </div>
              <Link
                to="/reviews"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 'clamp(12px, 1vw, 13px)',
                  fontWeight: 700,
                  color: TEAL,
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${TEAL}25`,
                  background: `${TEAL}08`,
                  transition: 'all .2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = TEAL;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${TEAL}08`;
                  e.currentTarget.style.color = TEAL;
                }}
              >
                View All <ArrowRight size={12} />
              </Link>
            </div>

            {loadingReviews ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '40px 0',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: `3px solid ${TEAL}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin .8s linear infinite',
                  }}
                />
              </div>
            ) : reviews.length === 0 ? (
              <div
                style={{
                  background: 'var(--card-bg, #fff)',
                  borderRadius: 20,
                  border: '1.5px solid var(--border-color, #F3F4F6)',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <MessageCircle
                  size={32}
                  color="#D1D5DB"
                  style={{ marginBottom: 10 }}
                />
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary, #374151)',
                    margin: '0 0 4px',
                  }}
                >
                  No Reviews Yet
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted, #9CA3AF)',
                    margin: 0,
                  }}
                >
                  Be the first to share your experience!
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 16,
                  }}
                >
                  {reviews.map((r) => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 30,
                  }}
                >
                  <Link to="/reviews" style={{ textDecoration: 'none' }}>
                    <button
                      className="ai-focus"
                      style={{
                        padding: '11px 30px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        background: 'var(--card-bg, #fff)',
                        color: TEAL,
                        fontWeight: 700,
                        fontSize: 'clamp(12px, 1vw, 14px)',
                        border: `2px solid ${TEAL}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all .2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = TEAL;
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          'var(--card-bg, #fff)';
                        e.currentTarget.style.color = TEAL;
                      }}
                    >
                      View All Reviews <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>

        <BackToTop />
      </div>
    </>
  );
};

export default Home;