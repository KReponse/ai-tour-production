
import React, { useMemo, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Compass,
  Bot,
  CalendarCheck,
  Plane,
  Star,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Shield,
  FileCheck,
  Settings,
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  PlusCircle,
  BookOpen,
  CreditCard,
  Wallet,
  MessageCircle,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";

const TRAVELER_LINKS = [
  { path: "/", icon: Home, label: "Home", end: true },
  { path: "/explore", icon: Compass, label: "Explore" },
  { path: "/ai-planner", icon: Bot, label: "AI Planner" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },

  // Trips page will contain Trips, My Bookings and Payments tabs.
  {
    path: "/trips",
    icon: Plane,
    label: "Trips",
    matchPaths: ["/trips", "/my-bookings", "/traveler/payments"],
  },

  // Reviews page will contain Community Reviews and My Reviews tabs.
  {
    path: "/reviews",
    icon: Star,
    label: "Reviews",
    matchPaths: ["/reviews", "/my-reviews"],
  },

  { path: "/profile", icon: User, label: "Profile" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/provider/request", icon: Briefcase, label: "Become Provider" },
];

const PROVIDER_LINKS = [
  { path: "/provider", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/provider/listings", icon: ClipboardList, label: "My Listings" },
  { path: "/provider/add-listing", icon: PlusCircle, label: "Add Listing" },
  { path: "/provider/bookings", icon: CalendarCheck, label: "Bookings" },
  { path: "/provider/travelers", icon: User, label: "Travelers" },
  { path: "/provider/reviews", icon: Star, label: "Reviews" },
  { path: "/provider/analytics", icon: TrendingUp, label: "Analytics" },
  { path: "/provider/payments", icon: CreditCard, label: "Payments" },
  { path: "/provider/earnings", icon: Wallet, label: "Earnings" },
  { path: "/provider/profile", icon: User, label: "Profile" },
  { path: "/provider/settings", icon: Settings, label: "Settings" },
];

const ADMIN_LINKS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/admin/users", icon: User, label: "Users" },
  { path: "/admin/providers", icon: Shield, label: "Providers" },
  {
    path: "/admin/provider-requests",
    icon: FileCheck,
    label: "Provider Requests",
  },
  { path: "/admin/listings", icon: ClipboardList, label: "Listings" },
  { path: "/admin/reviews", icon: Star, label: "Reviews" },
  { path: "/admin/payments", icon: CreditCard, label: "Payments" },
  { path: "/admin/notifications", icon: Bell, label: "Notifications" },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { user } = useAuth();

  const userRole = user?.role?.toLowerCase();

  const navItems = useMemo(() => {
    if (userRole === "provider") return PROVIDER_LINKS;
    if (userRole === "admin") return ADMIN_LINKS;
    return TRAVELER_LINKS;
  }, [userRole]);

  const getNavLinkClass = useCallback(
    ({ isActive }) =>
      clsx(
        "group flex items-center px-4 py-3 mx-2 my-1 rounded-xl",
        "transition-all duration-200",
        "hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20",
        isActive
          ? "bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488]"
          : "text-gray-700 dark:text-gray-300 hover:text-[#0D9488]",
        collapsed ? "justify-center" : "gap-3"
      ),
    [collapsed]
  );

  return (
    <aside
      className={clsx(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] z-40",
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
        "border-r border-gray-200 dark:border-gray-700",
        "transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        <nav
          aria-label="Main navigation"
          className="flex-1 py-5 overflow-y-auto"
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={getNavLinkClass}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                {({ isActive }) => {
                  const currentPath =
                    typeof window !== "undefined"
                      ? window.location.pathname
                      : "";

                  const groupedActive =
                    item.matchPaths?.some(
                      (path) =>
                        currentPath === path ||
                        currentPath.startsWith(`${path}/`)
                    ) ?? false;

                  const active = isActive || groupedActive;

                  return (
                    <>
                      <Icon
                        className={clsx(
                          "w-5 h-5 shrink-0 transition-colors",
                          active
                            ? "text-[#0D9488]"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]"
                        )}
                      />

                      {!collapsed && (
                        <span
                          className={clsx(
                            "font-medium text-sm",
                            active
                              ? "text-[#0D9488]"
                              : "text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={clsx(
            "hidden md:flex items-center justify-center",
            "p-2 m-4 rounded-xl",
            "text-gray-500 dark:text-gray-400",
            "hover:bg-[#0D9488]/10 hover:text-[#0D9488]",
            "dark:hover:bg-[#0D9488]/20 transition"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
