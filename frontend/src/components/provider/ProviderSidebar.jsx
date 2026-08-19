// src/components/provider/ProviderSidebar.jsx
// ✅ COMPLETE FIXED - Added Payments link with proper positioning
// ✅ RESPONSIVE - Mobile-optimized with proper touch targets (44px+)
// ✅ ADDED: Role-based access control
// ✅ ADDED: Section dividers
// ✅ FIXED: Mobile close button positioning

import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarClock,
  CalendarCheck,
  Users,
  BarChart3,
  Wallet,
  Star,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Map,
  X,
  Sparkles,
  TrendingUp,
  Home,
  MessageCircle,
  List,
  FileText,
  Edit,
  Package,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ProviderSidebar = ({ collapsed, onToggle, mobile, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ✅ Check if user has permission to view certain items
  const hasPermission = useMemo(() => {
    return (permission) => {
      if (!user) return false;
      // Admin has all permissions
      if (user.role === 'admin' || user.role === 'super_admin') return true;
      // Provider has limited permissions
      if (user.role === 'provider') {
        const providerPermissions = [
          'dashboard', 'listings', 'add-listing', 'bookings', 
          'travelers', 'analytics', 'earnings', 'reviews', 
          'payments', 'profile', 'settings'
        ];
        return providerPermissions.includes(permission);
      }
      return false;
    };
  }, [user]);

  // ✅ Primary nav items - Listing first
  const navItems = useMemo(() => [
    // ── Main ──
    { 
      name: 'Dashboard', 
      path: '/provider/dashboard', 
      icon: LayoutDashboard,
      permission: 'dashboard',
      section: 'main',
    },
    
    // ── LISTINGS (Primary) ──
    { 
      name: 'My Listings', 
      path: '/provider/listings', 
      icon: ClipboardList, 
      isPrimary: true,
      permission: 'listings',
      section: 'listings',
    },
    { 
      name: 'Add Listing', 
      path: '/provider/add-listing', 
      icon: PlusCircle, 
      isPrimary: true,
      permission: 'add-listing',
      section: 'listings',
    },
    
    // ── Business ──
    { 
      name: 'Bookings', 
      path: '/provider/bookings', 
      icon: CalendarCheck,
      permission: 'bookings',
      section: 'business',
    },
    { 
      name: 'Travelers', 
      path: '/provider/travelers', 
      icon: Users,
      permission: 'travelers',
      section: 'business',
    },
    { 
      name: 'Analytics', 
      path: '/provider/analytics', 
      icon: TrendingUp,
      permission: 'analytics',
      section: 'business',
    },
    { 
      name: 'Earnings', 
      path: '/provider/earnings', 
      icon: Wallet,
      permission: 'earnings',
      section: 'business',
    },
    { 
      name: 'Reviews', 
      path: '/provider/reviews', 
      icon: Star,
      permission: 'reviews',
      section: 'business',
    },
    
    // ✅ PAYMENTS - Added here
    { 
      name: 'Payments', 
      path: '/provider/payments', 
      icon: CreditCard,
      permission: 'payments',
      section: 'business',
    },
    
    // ── Profile ──
    { 
      name: 'Profile', 
      path: '/provider/profile', 
      icon: User,
      permission: 'profile',
      section: 'profile',
    },
    { 
      name: 'Settings', 
      path: '/provider/settings', 
      icon: Settings,
      permission: 'settings',
      section: 'profile',
    },
  ], []);

  // ✅ Filter items based on permissions and visibility
  const visibleNavItems = useMemo(() => {
    return navItems.filter(item => {
      if (item.hidden) return false;
      return hasPermission(item.permission);
    });
  }, [navItems, hasPermission]);

  // ✅ Group items by section for dividers
  const groupedItems = useMemo(() => {
    const groups = {};
    visibleNavItems.forEach(item => {
      const section = item.section || 'other';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    });
    return groups;
  }, [visibleNavItems]);

  // ✅ Section labels
  const sectionLabels = {
    main: 'Main',
    listings: 'Listings',
    business: 'Business',
    profile: 'Profile',
    other: 'Other',
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 md:top-16 h-screen md:h-[calc(100vh-4rem)]",
        "bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl",
        "border-r border-gray-200 dark:border-gray-800 shadow-2xl",
        "transition-all duration-300 z-50 overflow-hidden flex flex-col",
        mobile ? "w-72" : collapsed ? "w-20" : "w-72"
      )}
    >
      {/* ── HEADER ── */}
      <div className="px-4 sm:px-5 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
        {!collapsed || mobile ? (
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <h2 className="text-base sm:text-xl md:text-2xl font-black bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent truncate">
                Provider Panel
              </h2>
            </div>
            <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 ml-8 sm:ml-10 truncate">
              AI Tour Rwanda
            </p>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-md shadow-[#0D9488]/30">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
        )}

        {/* MOBILE CLOSE - Min 44px touch target */}
        {mobile && (
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition touch-manipulation"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        )}
      </div>

      {/* ── NAVIGATION ── */}
      <div className="flex-1 overflow-y-auto py-3 sm:py-5 px-2 sm:px-3 space-y-1">
        {Object.entries(groupedItems).map(([section, items], sectionIndex) => (
          <div key={section}>
            {/* Section Divider */}
            {sectionIndex > 0 && (
              <div className="px-3 py-2">
                <div className="border-t border-gray-200 dark:border-gray-800" />
              </div>
            )}
            
            {/* Section Label (only when expanded) */}
            {(!collapsed || mobile) && sectionLabels[section] && (
              <div className="px-3 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                  {sectionLabels[section]}
                </p>
              </div>
            )}

            {/* Section Items */}
            {items.map((item) => {
              const Icon = item.icon;
              const isPrimary = item.isPrimary || false;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (mobile && onClose) onClose();
                  }}
                  className={({ isActive }) =>
                    clsx(
                      "relative flex items-center rounded-xl sm:rounded-2xl transition-all duration-300 px-3 sm:px-4 py-2.5 sm:py-3 group overflow-hidden min-h-[44px]",
                      isActive
                        ? "bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] shadow-md shadow-[#0D9488]/10"
                        : "text-gray-700 dark:text-gray-300 hover:bg-[#0D9488]/5 dark:hover:bg-[#0D9488]/10 hover:text-[#0D9488]",
                      collapsed && !mobile ? "justify-center" : "gap-3 sm:gap-4",
                      isPrimary && !isActive && "border-l-2 border-transparent hover:border-[#0D9488]/30",
                      isPrimary && isActive && "border-l-2 border-[#0D9488]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Icon */}
                      <div className="relative flex-shrink-0">
                        <Icon
                          className={clsx(
                            "w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 group-hover:scale-110",
                            isActive ? "text-[#0D9488]" : "text-gray-500 dark:text-gray-400 group-hover:text-[#0D9488]"
                          )}
                        />
                        {/* Primary badge for Listing items */}
                        {isPrimary && !collapsed && (
                          <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D9488] animate-pulse" />
                        )}
                      </div>
                      
                      {/* Label */}
                      {(!collapsed || mobile) && (
                        <span
                          className={clsx(
                            "font-semibold text-xs sm:text-sm truncate transition-colors duration-300 flex-1",
                            isActive ? "text-[#0D9488]" : "text-gray-700 dark:text-gray-300 group-hover:text-[#0D9488]",
                            isPrimary && "font-extrabold"
                          )}
                        >
                          {item.name}
                        </span>
                      )}
                      
                      {/* Active indicator */}
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 sm:h-8 rounded-r-full bg-[#0D9488]" />
                      )}

                      {/* "NEW" badge for primary items */}
                      {isPrimary && !collapsed && !isActive && (
                        <span className="ml-auto text-[6px] sm:text-[8px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-1 sm:px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      {!mobile && (
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          {/* Logout Button - Min 44px touch target */}
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center w-full min-h-[44px] rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all duration-300 group",
              collapsed ? "justify-center px-2" : "px-3 sm:px-4 gap-3 sm:gap-4"
            )}
          >
            <LogOut className={clsx(
              "w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 group-hover:text-red-600 transition",
              collapsed && "flex-shrink-0"
            )} />
            {(!collapsed) && (
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600 transition truncate">
                Logout
              </span>
            )}
          </button>

          {/* Toggle Button - Min 44px touch target */}
          <button
            onClick={onToggle}
            className="hidden md:flex items-center justify-center w-full min-h-[44px] mt-2 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-all duration-300 group"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 dark:text-white group-hover:text-[#0D9488] transition" />
            ) : (
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 dark:text-white group-hover:text-[#0D9488] transition" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

export default ProviderSidebar;