// src/components/layout/Sidebar.jsx
// ✅ COMPLETE FIXED - All hooks at top level, no hooks inside loops
// ✅ FIXED - Correct payment paths for all user roles

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
  MessageCircle,
  ClipboardList,
  PlusCircle,
  BookOpen,
  CreditCard,
  Wallet,
  History,
  DollarSign,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ MOVED OUTSIDE COMPONENT - Static data doesn't need useMemo
const TRAVELER_LINKS = [
  { path: "/", icon: Home, label: "Home", isPrimary: false },
  { path: "/explore", icon: Compass, label: "Explore", isPrimary: false },
  { path: "/ai-planner", icon: Bot, label: "AI Planner", isPrimary: false },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", isPrimary: false },
  { path: "/my-bookings", icon: CalendarCheck, label: "My Bookings", isPrimary: false },
  { path: "/trips", icon: Plane, label: "Trips", isPrimary: false },
  { path: "/my-reviews", icon: BookOpen, label: "My Reviews", isPrimary: true },
  { path: "/reviews", icon: Star, label: "Community Reviews", isPrimary: false },
  // ✅ FIXED: Correct traveler payment path
  { path: "/traveler/payments", icon: CreditCard, label: "Payments", isPrimary: false, section: "payments" },
  { path: "/profile", icon: User, label: "Profile", isPrimary: false },
  { path: "/notifications", icon: Bell, label: "Notifications", isPrimary: false },
  { path: "/provider/request", icon: Briefcase, label: "Become Provider", isPrimary: false },
];

const PROVIDER_LINKS = [
  { path: "/provider", icon: LayoutDashboard, label: "Dashboard", isPrimary: false },
  { path: "/provider/listings", icon: ClipboardList, label: "My Listings", isPrimary: true },
  { path: "/provider/add-listing", icon: PlusCircle, label: "Add Listing", isPrimary: true },
  { path: "/provider/bookings", icon: CalendarCheck, label: "Bookings", isPrimary: false },
  { path: "/provider/travelers", icon: User, label: "Travelers", isPrimary: false },
  { path: "/provider/reviews", icon: Star, label: "Reviews", isPrimary: false },
  { path: "/provider/analytics", icon: TrendingUp, label: "Analytics", isPrimary: false },
  // ✅ Provider payment links
  { path: "/provider/payments", icon: CreditCard, label: "Payments", isPrimary: false, section: "payments" },
  { path: "/provider/earnings", icon: Wallet, label: "Earnings", isPrimary: false, section: "payments" },
  { path: "/provider/profile", icon: User, label: "Profile", isPrimary: false },
  { path: "/provider/settings", icon: Settings, label: "Settings", isPrimary: false },
];

const ADMIN_LINKS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", isPrimary: false },
  { path: "/admin/users", icon: User, label: "Users", isPrimary: false },
  { path: "/admin/providers", icon: Shield, label: "Providers", isPrimary: false },
  { path: "/admin/provider-requests", icon: FileCheck, label: "Provider Requests", isPrimary: false },
  { path: "/admin/listings", icon: ClipboardList, label: "Listings", isPrimary: true },
  { path: "/admin/reviews", icon: Star, label: "Reviews", isPrimary: false },
  // ✅ Admin payment links
  { path: "/admin/payments", icon: CreditCard, label: "Payments", isPrimary: false, section: "payments" },
  { path: "/admin/notifications", icon: Bell, label: "Notifications", isPrimary: false },
];

const Sidebar = ({ collapsed, onToggle }) => {
  // ✅ ALL HOOKS AT THE TOP - Before any returns or logic
  const { user } = useAuth();

  // ✅ Memoize user role to prevent recalculations
  const userRole = useMemo(() => user?.role, [user?.role]);

  // ✅ Memoize nav items based on role
  const navItems = useMemo(() => {
    if (userRole === "provider" || userRole === "PROVIDER") {
      return PROVIDER_LINKS;
    } else if (userRole === "admin" || userRole === "ADMIN") {
      return ADMIN_LINKS;
    }
    return TRAVELER_LINKS;
  }, [userRole]);

  // ✅ Memoize collapse state for stable class calculations
  const isCollapsed = useMemo(() => collapsed, [collapsed]);

  // ✅ Memoize sidebar classes
  const sidebarClasses = useMemo(
    () =>
      clsx(
        "fixed left-0 top-16 h-[calc(100vh-4rem)]",
        "bg-white/80 dark:bg-gray-900/80",
        "backdrop-blur-md",
        "border-r",
        "border-gray-200 dark:border-gray-700",
        "transition-all duration-300 z-40",
        isCollapsed ? "w-20" : "w-64"
      ),
    [isCollapsed]
  );

  // ✅ Memoize nav link class generator with useCallback
  const getNavLinkClass = useCallback(
    ({ isActive }) =>
      clsx(
        "flex items-center px-4 py-3 mx-2 my-1 rounded-xl",
        "transition-all duration-200",
        "hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20",
        isActive
          ? "bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] dark:text-[#0D9488]"
          : "text-gray-700 dark:text-gray-300 hover:text-[#0D9488]",
        isCollapsed ? "justify-center" : "space-x-3"
      ),
    [isCollapsed]
  );

  // ✅ Memoize icon class generator
  const getIconClass = useCallback(
    (isActive) =>
      clsx(
        "w-5 h-5 transition-colors",
        isActive ? "text-[#0D9488]" : "text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]"
      ),
    []
  );

  // ✅ Memoize label class generator
  const getLabelClass = useCallback(
    (isActive, isPrimaryItem) =>
      clsx(
        "font-medium transition-colors",
        isActive ? "text-[#0D9488]" : "text-gray-700 dark:text-gray-300",
        isPrimaryItem && "font-semibold"
      ),
    []
  );

  // ✅ Memoize toggle button classes
  const toggleButtonClasses = useMemo(
    () =>
      clsx(
        "hidden",
        "md:flex",
        "items-center",
        "justify-center",
        "p-2",
        "m-4",
        "rounded-xl",
        "hover:bg-[#0D9488]/10",
        "dark:hover:bg-[#0D9488]/20",
        "text-gray-500",
        "dark:text-gray-400",
        "hover:text-[#0D9488]",
        "transition"
      ),
    []
  );

  // ✅ Group items by section
  const groupedNavItems = useMemo(() => {
    const mainItems = [];
    const paymentItems = [];
    
    navItems.forEach(item => {
      if (item.section === 'payments') {
        paymentItems.push(item);
      } else {
        mainItems.push(item);
      }
    });
    
    return { mainItems, paymentItems };
  }, [navItems]);

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col h-full">
        <div className="flex-1 py-6 overflow-y-auto">
          {/* Main Navigation Items */}
          {groupedNavItems.mainItems.map((item) => {
            const Icon = item.icon;
            const isPrimaryItem = item.isPrimary || false;

            return (
              <NavLink key={item.path} to={item.path} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Icon className={getIconClass(isActive)} />
                    {!isCollapsed && (
                      <span className={getLabelClass(isActive, isPrimaryItem)}>
                        {item.label}
                      </span>
                    )}
                    {isPrimaryItem && !isCollapsed && !isActive && (
                      <span className="ml-auto text-[8px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Payment Section Separator */}
          {groupedNavItems.paymentItems.length > 0 && !isCollapsed && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Payments
                </span>
              </div>
            </div>
          )}

          {/* Payment Navigation Items */}
          {groupedNavItems.paymentItems.map((item) => {
            const Icon = item.icon;
            const isPrimaryItem = item.isPrimary || false;

            return (
              <NavLink key={item.path} to={item.path} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Icon className={getIconClass(isActive)} />
                    {!isCollapsed && (
                      <span className={getLabelClass(isActive, isPrimaryItem)}>
                        {item.label}
                      </span>
                    )}
                    {isPrimaryItem && !isCollapsed && !isActive && (
                      <span className="ml-auto text-[8px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Collapse Toggle Button */}
        <button onClick={onToggle} className={toggleButtonClasses}>
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;