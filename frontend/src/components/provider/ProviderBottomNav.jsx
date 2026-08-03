// src/components/provider/ProviderBottomNav.jsx

import React from 'react';
import {
  LayoutDashboard,
  CalendarClock,
  PlusCircle,
  BarChart3,
  User,
  Home,
  Compass,
  Sparkles,
  ClipboardList, // ✅ Added for Listings
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import logo from "../../assets/images/logo.png";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const ProviderBottomNav = ({ variant = 'provider' }) => {
  // Provider nav items - ✅ Updated: Tours → Listings
  const providerNavItems = [
    {
      name: 'Dashboard',
      path: '/provider/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Listings', // ✅ Changed from "Tours"
      path: '/provider/listings',
      icon: ClipboardList, // ✅ Changed from Compass
    },
    {
      name: 'Add',
      path: '/provider/add-listing', // ✅ Changed from add-tour
      icon: PlusCircle,
    },
    {
      name: 'Bookings',
      path: '/provider/bookings',
      icon: CalendarClock,
    },
    {
      name: 'Profile',
      path: '/provider/profile',
      icon: User,
    },
  ];

  // Admin nav items - ✅ Updated: Tours → Listings
  const adminNavItems = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: User,
    },
    {
      name: 'Listings', // ✅ Changed from "Tours"
      path: '/admin/listings',
      icon: ClipboardList, // ✅ Changed from Compass
    },
    {
      name: 'Requests',
      path: '/admin/provider-requests',
      icon: CalendarClock,
    },
    {
      name: 'Home',
      path: '/',
      icon: Home,
    },
  ];

  const navItems = variant === 'admin' ? adminNavItems : providerNavItems;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="grid grid-cols-5 h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 relative group',
                  isActive
                    ? 'text-[#0D9488]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-[#0D9488]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    'relative p-1.5 rounded-xl transition-all duration-200',
                    isActive && 'bg-[#0D9488]/10'
                  )}>
                    <Icon className={clsx(
                      'w-6 h-6 transition-transform duration-200',
                      isActive && 'scale-110'
                    )} />
                    
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0D9488] rounded-full" />
                    )}
                  </div>

                  <span className={clsx(
                    'text-[11px] font-semibold transition-colors duration-200',
                    isActive ? 'text-[#0D9488]' : 'text-gray-500 dark:text-gray-400'
                  )}>
                    {item.name}
                  </span>

                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#374151] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderBottomNav;