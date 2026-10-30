// src/components/navigation/TravelerTabs.jsx
// ============================================================
// AI TOUR — SHARED TRAVELER TAB BAR
// ============================================================
// ✅ Route-driven: highlight follows useLocation().pathname.
//    Works for direct URL, refresh, back/forward.
// ✅ Two variants: 'trips' | 'reviews'
// ✅ Zero side effects — pure navigation UI.
// ✅ Mobile-responsive (horizontal scroll if needed).
// ============================================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plane, ClipboardList, CreditCard, MessageCircle, Star } from 'lucide-react';

// ===============================
// TAB DEFINITIONS
// ===============================

const TRIPS_TABS = [
  { key: 'trips',     label: 'Trips',        to: '/trips',              icon: Plane },
  { key: 'bookings',  label: 'My Bookings',  to: '/my-bookings',        icon: ClipboardList },
  { key: 'payments',  label: 'Payments',     to: '/traveler/payments',  icon: CreditCard },
];

const REVIEWS_TABS = [
  { key: 'community', label: 'Community Reviews', to: '/reviews',    icon: MessageCircle },
  { key: 'mine',      label: 'My Reviews',        to: '/my-reviews', icon: Star },
];

// ===============================
// ACTIVE MATCHER
// ===============================
// Returns true when the current path matches a tab's route.
// Exact match preferred, plus prefix-match for nested routes
// (e.g. /trips/123 should still highlight the "Trips" tab).
const isTabActive = (pathname, tabRoute) => {
  if (pathname === tabRoute) return true;
  // For nested detail pages, still highlight the parent tab
  if (tabRoute !== '/' && pathname.startsWith(tabRoute + '/')) return true;
  return false;
};

// ===============================
// COMPONENT
// ===============================

const TravelerTabs = ({ variant = 'trips', className = '' }) => {
  const { pathname } = useLocation();
  const tabs = variant === 'reviews' ? REVIEWS_TABS : TRIPS_TABS;

  return (
    <div
      className={`w-full border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-hide ${className}`}
      role="tablist"
      aria-label={variant === 'reviews' ? 'Reviews navigation' : 'Trips navigation'}
    >
      <div className="flex items-center gap-1 sm:gap-2 min-w-max sm:min-w-0">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.to);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              to={tab.to}
              role="tab"
              aria-selected={active}
              className={`
                relative flex items-center gap-2 px-4 sm:px-6 py-3
                text-sm sm:text-base font-semibold whitespace-nowrap
                transition-colors duration-200 outline-none
                focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2
                ${
                  active
                    ? 'text-[#0D9488]'
                    : 'text-[#374151] dark:text-gray-300 hover:text-[#0D9488] dark:hover:text-[#0D9488]'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>

              {/* Active underline */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#0D9488]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TravelerTabs;