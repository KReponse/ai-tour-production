// src/contexts/ThemeContext.jsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Export ThemeContext
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // GET SAVED THEME
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // APPLY THEME
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Toggle theme function
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
        toggleTheme,
        isDark: darkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ✅ Export useTheme hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ✅ Default export for backward compatibility
export default ThemeProvider;