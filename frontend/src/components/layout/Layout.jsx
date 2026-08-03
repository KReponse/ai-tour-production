// src/components/layout/Layout.jsx
// ✅ COMPLETE FIXED - Memoized values and optimized re-renders

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { Outlet } from 'react-router-dom';

import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Footer from './Footer';

const Layout = () => {
  const [isMobile, setIsMobile] = useState(
    window.innerWidth < 768
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Memoize sidebar collapsed state for stable callbacks
  const isSidebarCollapsed = useMemo(() => sidebarCollapsed, [sidebarCollapsed]);

  // ✅ Memoize isMobile state
  const isMobileDevice = useMemo(() => isMobile, [isMobile]);

  // ✅ Handle resize with useCallback to prevent recreation
  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // ✅ Toggle sidebar with useCallback
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // ✅ Handle window resize with cleanup
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // ✅ Memoize sidebar margin classes
  const mainMarginClass = useMemo(() => {
    if (isMobileDevice) return 'ml-0';
    return isSidebarCollapsed ? 'ml-20' : 'ml-64';
  }, [isMobileDevice, isSidebarCollapsed]);

  // ✅ Memoize main content classes
  const mainClasses = useMemo(() => `
    flex-1
    transition-all
    duration-300
    min-h-screen
    ${mainMarginClass}
    p-4
    md:p-6
    pb-20
    md:pb-6
  `, [mainMarginClass]);

  // ✅ Memoize sidebar props to prevent unnecessary re-renders
  const sidebarProps = useMemo(() => ({
    collapsed: isSidebarCollapsed,
    onToggle: toggleSidebar,
  }), [isSidebarCollapsed, toggleSidebar]);

  // ✅ Memoize navbar props
  const navbarProps = useMemo(() => ({
    onMenuClick: toggleSidebar,
  }), [toggleSidebar]);

  // ✅ Memoize layout class
  const layoutClass = useMemo(() => `
    w-full
    min-h-screen
    overflow-x-hidden
    bg-background
    dark:bg-gray-950
    transition-colors
    duration-300
  `, []);

  return (
    <div className={layoutClass}>

      {/* NAVBAR */}
      <Navbar {...navbarProps} />

      <div className="flex pt-16">

        {/* SIDEBAR */}
        {!isMobileDevice && (
          <Sidebar {...sidebarProps} />
        )}

        {/* MAIN CONTENT */}
        <main className={mainClasses}>

          {/* PAGE CONTENT */}
          <Outlet />

          {/* FOOTER */}
          <Footer />

        </main>
      </div>

      {/* MOBILE NAV */}
      {isMobileDevice && <BottomNav />}

    </div>
  );
};

export default Layout;