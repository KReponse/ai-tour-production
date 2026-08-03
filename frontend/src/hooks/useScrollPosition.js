// frontend/src/hooks/useScrollPosition.js
// ✅ FIXED: Scroll restoration with useLayoutEffect (runs before paint)
// ✅ FIXED: Added scroll preservation on navigation with timestamp
// ✅ FIXED: Added beforeunload save
// ✅ FIXED: Prevent scroll restoration loops

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

export const useScrollPosition = (key = 'scrollPosition') => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const elementRef = useRef(null);
  const isRestoringRef = useRef(false);
  const isSavingRef = useRef(false);

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (isRestoringRef.current) return;
    
    if (elementRef.current) {
      const position = elementRef.current.scrollTop || window.scrollY;
      setScrollPosition(position);
      sessionStorage.setItem(key, String(position));
      sessionStorage.setItem(`${key}_timestamp`, String(Date.now()));
    }
  }, [key]);

  // ✅ Restore scroll position using useLayoutEffect (runs before paint)
  const restoreScrollPosition = useCallback(() => {
    const saved = sessionStorage.getItem(key);
    const timestamp = sessionStorage.getItem(`${key}_timestamp`);
    
    // Only restore if saved within last 5 minutes
    if (saved && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < 300000) { // 5 minutes
        const position = parseInt(saved, 10);
        isRestoringRef.current = true;
        
        // Use requestAnimationFrame for smoother restoration
        requestAnimationFrame(() => {
          if (elementRef.current) {
            elementRef.current.scrollTop = position;
          } else {
            window.scrollTo({
              top: position,
              behavior: 'instant'
            });
          }
          setScrollPosition(position);
          // Clear storage after restoration
          sessionStorage.removeItem(key);
          sessionStorage.removeItem(`${key}_timestamp`);
          
          // Reset restoring flag after a short delay
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        });
        return true;
      }
    }
    return false;
  }, [key]);

  // Scroll to top
  const scrollToTop = useCallback((behavior = 'smooth') => {
    if (elementRef.current) {
      elementRef.current.scrollTo({ top: 0, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, []);

  // Scroll to element
  const scrollToElement = useCallback((element, behavior = 'smooth') => {
    if (element) {
      element.scrollIntoView({ behavior, block: 'start' });
    }
  }, []);

  // ✅ Use useLayoutEffect for scroll restoration (runs before paint)
  useLayoutEffect(() => {
    // Try to restore scroll position on mount
    const restored = restoreScrollPosition();
    
    // If not restored, save current position after a delay
    if (!restored) {
      const timer = setTimeout(() => {
        saveScrollPosition();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [restoreScrollPosition, saveScrollPosition]);

  // Update scroll state on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringRef.current) return;
      
      const scrollY = elementRef.current 
        ? elementRef.current.scrollTop 
        : window.scrollY;
      
      const maxScroll = elementRef.current
        ? elementRef.current.scrollHeight - elementRef.current.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;

      setScrollPosition(scrollY);
      setIsAtTop(scrollY <= 10);
      setIsAtBottom(scrollY >= maxScroll - 10);
    };

    const target = elementRef.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Save scroll on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      isRestoringRef.current = false;
      saveScrollPosition();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveScrollPosition]);

  return {
    scrollPosition,
    isAtTop,
    isAtBottom,
    elementRef,
    saveScrollPosition,
    restoreScrollPosition,
    scrollToTop,
    scrollToElement,
  };
};

export default useScrollPosition;