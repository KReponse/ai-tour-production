// src/components/layout/BottomNav.jsx

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Bot, Plane, User, CalendarCheck, Star } from 'lucide-react';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const BottomNav = () => {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // scroll down → hide
        setVisible(false);
      } else {
        // scroll up → show
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/explore', icon: Compass, label: 'Explore' },
    { path: '/ai-planner', icon: Bot, label: 'AI' },
    { path: '/trips', icon: Plane, label: 'Trips' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex justify-around items-center py-1.5 px-2">

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  'flex flex-col items-center p-2 rounded-xl transition-all duration-200 min-w-[56px]',
                  isActive
                    ? 'text-[#0D9488]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-[#0D9488]'
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={clsx(
                      'relative p-1.5 rounded-xl transition-all duration-200',
                      isActive && 'bg-[#0D9488]/10'
                    )}>
                      <Icon className={clsx(
                        'w-5 h-5 transition-transform duration-200',
                        isActive && 'scale-110'
                      )} />
                      
                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#0D9488] rounded-full" />
                      )}
                    </div>
                    
                    <span className={clsx(
                      'text-[10px] font-medium mt-0.5 transition-colors duration-200',
                      isActive ? 'text-[#0D9488]' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

        </div>
      </div>
    </nav>
  );
};

export default BottomNav;