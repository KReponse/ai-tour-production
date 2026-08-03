import React, {
  useState,
  useEffect,
} from 'react';

import { Outlet } from 'react-router-dom';

import ProviderNavbar from '../components/provider/ProviderNavbar';
import ProviderMobileNavbar from '../components/provider/ProviderMobileNavbar';
import ProviderSidebar from '../components/provider/ProviderSidebar';
import ProviderBottomNav from '../components/provider/ProviderBottomNav';
import ProviderFooter from '../components/provider/ProviderFooter';

const DashboardLayout = () => {

  const [collapsed, setCollapsed] =
    useState(false);

  const [isMobile, setIsMobile] =
    useState(
      window.innerWidth < 768
    );

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  useEffect(() => {

    const handleResize = () => {

      setIsMobile(
        window.innerWidth < 768
      );

    };

    window.addEventListener(
      'resize',
      handleResize
    );

    return () =>
      window.removeEventListener(
        'resize',
        handleResize
      );

  }, []);

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">

      {/* DESKTOP NAVBAR */}
      {!isMobile && (
        <ProviderNavbar />
      )}

      {/* MOBILE NAVBAR */}
      {isMobile && (
        <ProviderMobileNavbar
          onMenuClick={() =>
            setMobileSidebarOpen(true)
          }
        />
      )}

      <div className="flex">

        {/* ================= DESKTOP SIDEBAR ================= */}
        {!isMobile && (

          <ProviderSidebar
            collapsed={collapsed}
            onToggle={() =>
              setCollapsed(
                !collapsed
              )
            }
          />

        )}

        {/* ================= MOBILE SIDEBAR ================= */}
        {isMobile && mobileSidebarOpen && (

          <>
            {/* OVERLAY */}
            <div
              onClick={() =>
                setMobileSidebarOpen(false)
              }
              className="
                fixed
                inset-0
                bg-black/50
                backdrop-blur-sm
                z-40
              "
            />

            {/* SIDEBAR DRAWER */}
            <div
              className="
                fixed
                top-0
                left-0
                h-screen
                z-50
                animate-slideIn
              "
            >

              <ProviderSidebar
                collapsed={false}
                mobile={true}
                onClose={() =>
                  setMobileSidebarOpen(false)
                }
              />

            </div>
          </>

        )}

        {/* ================= MAIN CONTENT ================= */}
        <main
          className={`
            flex-1
            transition-all
            duration-300
            min-h-screen
            pt-20
            px-4
            md:px-8
            pb-28
            ${
              !isMobile
                ? collapsed
                  ? 'ml-20'
                  : 'ml-72'
                : 'ml-0'
            }
          `}
        >

          {/* PAGE CONTENT */}
          <div className="w-full max-w-[1800px] mx-auto">

            <Outlet />

            {/* FOOTER */}
            <ProviderFooter />

          </div>

        </main>

      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      {isMobile && (
        <ProviderBottomNav />
      )}

    </div>

  );

};

export default DashboardLayout;