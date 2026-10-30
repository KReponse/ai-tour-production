
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarCheck, Plane, CreditCard, Star, BookOpen } from "lucide-react";
import clsx from "clsx";

const TRIP_TABS = [
  { path: "/trips", label: "Trips", icon: Plane },
  { path: "/my-bookings", label: "My Bookings", icon: CalendarCheck },
  { path: "/traveler/payments", label: "Payments", icon: CreditCard },
];

const REVIEW_TABS = [
  { path: "/reviews", label: "Community Reviews", icon: Star },
  { path: "/my-reviews", label: "My Reviews", icon: BookOpen },
];

export default function TravelerSectionTabs({ section }) {
  const location = useLocation();

  const tabs = section === "trips" ? TRIP_TABS : REVIEW_TABS;

  return (
    <div
      className="mb-6 border-b border-gray-200 dark:border-gray-700"
      aria-label={section === "trips" ? "Trip navigation" : "Review navigation"}
    >
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path ||
            location.pathname.startsWith(`${path}/`);

          return (
            <NavLink
              key={path}
              to={path}
              end
              className={clsx(
                "inline-flex items-center gap-2 whitespace-nowrap",
                "px-4 py-3 border-b-2 text-sm font-medium transition-colors",
                active
                  ? "border-[#0D9488] text-[#0D9488]"
                  : "border-transparent text-gray-500 hover:text-[#0D9488] hover:border-[#0D9488]/40"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
