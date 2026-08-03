// frontend/src/main.jsx
// ✅ COMPLETE FIXED - Removed StrictMode to prevent double rendering and debugger pauses

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';

import { ThemeProvider } from './contexts/ThemeContext';
import { BookingProvider } from './contexts/BookingContext';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  // ✅ Removed React.StrictMode to prevent double rendering
  // StrictMode can cause components to render twice in development,
  // which can trigger debugger statements and error boundaries
  <BrowserRouter>
    <ScrollToTop />
    <AuthProvider>
      <ThemeProvider>
        <BookingProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#374151",
                color: "#fff",
                borderRadius: "16px",
              },
              success: {
                style: {
                  background: "#0D9488",
                },
              },
              error: {
                style: {
                  background: "#DC2626",
                },
              },
            }}
          />
        </BookingProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
);