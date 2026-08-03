import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 🔥 SHOW LOADING WHILE CHECKING AUTH
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">
          Loading...
        </p>
      </div>
    );
  }

  // 🔐 IF NOT LOGGED IN → REDIRECT TO LOGIN
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // ✅ IF LOGGED IN → ALLOW ACCESS
  return children;
};

export default ProtectedRoute;