// src/components/ui/FloatingAIButton.jsx
// ✅ COMPLETE FIXED - Uses exported BOTTOM_NAV_HEIGHT constant

import { useState, useEffect } from "react";
import { Sparkles, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BOTTOM_NAV_HEIGHT } from "../layout/BottomNav";

const FloatingAIButton = ({
  showTooltip = true,
  pulseAnimation = true,
  position = "bottom-right",
  onOpen,
}) => {
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      if (current > lastScroll && current > 120) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScroll(current);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, [lastScroll]);

  // ✅ Get position classes - mobile aware
  const getPositionClasses = () => {
    if (isMobile) {
      // ✅ On mobile: position above bottom navigation
      return "right-4";
    }
    const positions = {
      "bottom-right": "bottom-6 right-6",
      "bottom-left": "bottom-6 left-6",
      "top-right": "top-6 right-6",
      "top-left": "top-6 left-6",
    };
    return positions[position] || positions["bottom-right"];
  };

  // ✅ Get bottom offset for mobile using imported constant
  const getBottomOffset = () => {
    if (isMobile) {
      // ✅ 16px gap + bottom nav height + safe area
      return `calc(${BOTTOM_NAV_HEIGHT + 16}px + env(safe-area-inset-bottom))`;
    }
    return '1.5rem'; // default bottom-6
  };

  const positionClasses = getPositionClasses();
  const tooltip =
    position.includes("right")
      ? "right-20 top-1/2 -translate-y-1/2"
      : "left-20 top-1/2 -translate-y-1/2";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            scale: 0,
            opacity: 0,
          }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          exit={{
            scale: 0,
            opacity: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className={`fixed ${positionClasses} z-[999]`}
          style={{
            // ✅ Apply bottom offset for mobile
            bottom: getBottomOffset(),
          }}
        >
          <div className="relative group">

            {pulseAnimation && (
              <>
                <span className="absolute inset-0 rounded-full bg-[#0D9488] animate-ping opacity-30"></span>

                <span className="absolute inset-2 rounded-full bg-[#F59E0B] animate-ping opacity-20"></span>
              </>
            )}

            <button
              onClick={onOpen}
              className="
              relative
              w-14
              h-14
              md:w-16
              md:h-16
              rounded-full
              bg-gradient-to-r
              from-[#0D9488]
              to-[#F59E0B]
              text-white
              flex
              items-center
              justify-center
              shadow-2xl
              hover:scale-110
              transition
              shadow-[#0D9488]/30
            "
            >
              <Sparkles size={24} className="md:w-[30px] md:h-[30px]" />
            </button>

            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500 border-2 border-white animate-pulse"></span>

            {showTooltip && (
              <div
                className={`
                absolute
                ${tooltip}
                px-3
                md:px-4
                py-1.5
                md:py-2
                rounded-xl
                bg-[#374151]
                text-white
                text-xs
                md:text-sm
                opacity-0
                group-hover:opacity-100
                transition
                whitespace-nowrap
                hidden
                md:block
              `}
              >
                <div className="flex items-center gap-2">
                  <Bot
                    size={14}
                    className="md:w-[16px] md:h-[16px] text-[#F59E0B]"
                  />
                  Ask AI Tour
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-center text-[8px] md:text-[10px] text-gray-400 hidden md:block">
            AI Assistant
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingAIButton;