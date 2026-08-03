// src/components/ui/FloatingAIButton.jsx

import { useState, useEffect } from "react";
import { Sparkles, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FloatingAIButton = ({
  showTooltip = true,
  pulseAnimation = true,
  position = "bottom-right",
  onOpen,
}) => {
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  const positions = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

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
          className={`fixed ${positions[position]} z-[999]`}
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
              w-16
              h-16
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
            "
            >
              <Sparkles size={30} />
            </button>

            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white animate-pulse"></span>

            {showTooltip && (
              <div
                className={`
                absolute
                ${tooltip}
                px-4
                py-2
                rounded-xl
                bg-[#374151]
                text-white
                text-sm
                opacity-0
                group-hover:opacity-100
                transition
                whitespace-nowrap
              `}
              >
                <div className="flex items-center gap-2">
                  <Bot
                    size={16}
                    className="text-[#F59E0B]"
                  />
                  Ask AI Tour
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-center text-[10px] text-gray-400">
            AI Assistant
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingAIButton;