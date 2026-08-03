// src/components/admin/AdminSidebar.jsx
// ✅ UPDATED - Added Footer Settings, Settlements, and Hero Media
// ❌ REMOVED - Featured Experiences (completely removed)

import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Map,
  Calendar,
  Bell,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Home,
  Settings,
  TrendingUp,
  Star,
  MessageCircle,
  List,
  Package,
  Briefcase,
  UserCheck,
  UserCog,
  ClipboardList,
  PlusCircle,
  // Payment and Booking icons
  CreditCard,
  DollarSign,
  BookOpen,
  CalendarDays,
  Receipt,
  // Footer icon
  FileText,
  // ✅ ADD: Settlement icon
  Wallet,
  // ✅ ADD: Ledger icon
  BookOpenCheck,
  // ✅ ADD: Exchange Rate icon
  RefreshCw,
  // ✅ ADD: Hero Media icon (reusing Home icon)
  Home as HomeIcon,
  // ✅ ADD: Image icon for fallback
  Image as ImageIcon,
} from "lucide-react";
import clsx from "clsx";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ UPDATED: Removed Featured Experiences
const menuItems = [
  // ── Primary ──
  { 
    name: "Dashboard", 
    path: "/admin/dashboard", 
    icon: LayoutDashboard, 
    isPrimary: true 
  },
  
  // ── Users ──
  { 
    name: "Users", 
    path: "/admin/users", 
    icon: Users 
  },
  
  // ── Listings ──
  { 
    name: "Listings", 
    path: "/admin/listings", 
    icon: ClipboardList, 
    isPrimary: true 
  },
  
  // ⚠️ Legacy: Tours (hidden from sidebar, kept for redirects)
  { 
    name: "Tours", 
    path: "/admin/tours", 
    icon: Map, 
    hidden: true, 
    isLegacy: true 
  },
  
  // ── Bookings ──
  { 
    name: "Bookings", 
    path: "/admin/bookings", 
    icon: CalendarDays,
    isPrimary: true,
    badge: "All"
  },
  
  // ── Payments ──
  { 
    name: "Payments", 
    path: "/admin/payments", 
    icon: CreditCard,
    isPrimary: true,
    badge: "Analytics"
  },
  
  // ── Providers ──
  { 
    name: "Providers", 
    path: "/admin/providers", 
    icon: UserCheck 
  },
  
  // ── Provider Requests ──
  { 
    name: "Provider Requests", 
    path: "/admin/provider-requests", 
    icon: ShieldCheck 
  },
  
  // ── Reviews ──
  { 
    name: "Reviews", 
    path: "/admin/reviews", 
    icon: Star 
  },
  
  // ── Notifications ──
  { 
    name: "Notifications", 
    path: "/admin/notifications", 
    icon: Bell 
  },

  // ── Financial Management Group ──
  // ✅ Settlements
  { 
    name: "Settlements", 
    path: "/admin/settlements", 
    icon: Wallet,
    isPrimary: true,
    badge: "Payouts"
  },
  
  // ✅ Ledger
  { 
    name: "Ledger", 
    path: "/admin/ledger", 
    icon: BookOpenCheck,
    isPrimary: true
  },
  
  // ✅ Exchange Rates
  { 
    name: "Exchange Rates", 
    path: "/admin/exchange-rates", 
    icon: RefreshCw,
    isPrimary: true
  },
  
  // ── Marketing Group ──
  // ✅ Hero Media (Dedicated hero video management)
  { 
    name: "Hero Media", 
    path: "/admin/hero-media", 
    icon: HomeIcon,
    isPrimary: true,
    badge: "Hero"
  },
  
  // ── Settings Group ──
  { 
    name: "Settings", 
    path: "/admin/settings", 
    icon: Settings,
    isPrimary: false
  },
  
  // ── Footer Settings ──
  { 
    name: "Footer Settings", 
    path: "/admin/footer-settings", 
    icon: FileText,
    isPrimary: false
  },
];

// ✅ Filter out hidden/legacy items from sidebar display
const visibleMenuItems = menuItems.filter(item => !item.hidden);

// ✅ Group items for better organization
const groupedMenuItems = [
  { 
    group: "Main", 
    items: visibleMenuItems.filter(item => 
      ['Dashboard', 'Listings', 'Bookings', 'Payments'].includes(item.name)
    ) 
  },
  { 
    group: "Management", 
    items: visibleMenuItems.filter(item => 
      ['Users', 'Providers', 'Provider Requests', 'Reviews', 'Notifications'].includes(item.name)
    ) 
  },
  { 
    group: "Financial", 
    items: visibleMenuItems.filter(item => 
      ['Settlements', 'Ledger', 'Exchange Rates'].includes(item.name)
    ) 
  },
  { 
    group: "Marketing", 
    items: visibleMenuItems.filter(item => 
      ['Hero Media'].includes(item.name)
    ) 
  },
  { 
    group: "Settings", 
    items: visibleMenuItems.filter(item => 
      ['Settings', 'Footer Settings'].includes(item.name)
    ) 
  },
];

const AdminSidebar = ({ collapsed, onToggle, onClose, mobile = false }) => {
  return (
    <aside
      className={clsx(
        "fixed left-0",
        mobile ? "top-0 h-screen" : "top-16 h-[calc(100vh-4rem)]",
        "bg-white/95 dark:bg-gray-950/95",
        "backdrop-blur-xl",
        "border-r border-gray-200 dark:border-gray-800",
        "transition-all duration-300",
        "z-50 shadow-2xl",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full">

        {/* LOGO */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white shadow-lg shadow-[#0D9488]/30">
                <Sparkles size={22} />
              </div>

              {!collapsed && (
                <div>
                  <h1 className="font-black text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent">
                    AI Tour Rwanda
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Admin Portal
                  </p>
                </div>
              )}
            </div>

            {/* MOBILE CLOSE */}
            {mobile && (
              <button
                onClick={onClose}
                className="lg:hidden w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition"
              >
                <X size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 py-6 space-y-4 px-3 overflow-y-auto">
          {/* Render grouped menu items */}
          {groupedMenuItems.map((group, groupIndex) => {
            // Skip empty groups
            if (group.items.length === 0) return null;
            
            return (
              <div key={groupIndex} className="space-y-1">
                {/* Group header - only show when not collapsed */}
                {!collapsed && (
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group.group}
                    </span>
                  </div>
                )}
                
                {group.items.map((item) => {
                  const isPrimary = item.isPrimary || false;
                  const hasBadge = item.badge || false;
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (mobile) onClose();
                      }}
                      className={({ isActive }) =>
                        clsx(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group",
                          collapsed && "justify-center",
                          isActive
                            ? "bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] shadow-md shadow-[#0D9488]/10"
                            : "text-gray-700 dark:text-gray-300 hover:bg-[#0D9488]/5 dark:hover:bg-[#0D9488]/10 hover:text-[#0D9488]",
                          isPrimary && !isActive && "border-l-2 border-transparent hover:border-[#0D9488]/30",
                          isPrimary && isActive && "border-l-2 border-[#0D9488]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={clsx(
                              "w-5 h-5 transition-all duration-200",
                              isActive
                                ? "text-[#0D9488]"
                                : "text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]"
                            )}
                          />
                          {!collapsed && (
                            <span
                              className={clsx(
                                "font-medium transition-colors duration-200 flex-1",
                                isActive ? "text-[#0D9488]" : "text-gray-700 dark:text-gray-300",
                                isPrimary && "font-semibold"
                              )}
                            >
                              {item.name}
                            </span>
                          )}
                          {/* Badge for items */}
                          {hasBadge && !collapsed && !isActive && (
                            <span className="ml-auto text-[9px] font-bold text-white bg-[#0D9488] px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {isActive && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-[#0D9488]" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* BOTTOM - Admin Info */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#0D9488]/5 to-[#F59E0B]/5 border border-[#0D9488]/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-medium text-[#374151] dark:text-white">
                  Admin Access
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Full system management
              </p>
            </div>
          </div>
        )}

        {/* COLLAPSE */}
        {!mobile && (
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center mx-4 mb-5 p-3 rounded-xl hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-all duration-300"
          >
            {collapsed ? (
              <ChevronRight size={20} className="text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]" />
            ) : (
              <ChevronLeft size={20} className="text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]" />
            )}
          </button>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;