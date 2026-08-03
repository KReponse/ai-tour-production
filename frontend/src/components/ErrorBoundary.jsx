// src/components/ErrorBoundary.jsx

import React from 'react';
import { AlertCircle, RefreshCw, Home, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ isRecovering: true });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRecovering: false,
    });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Something went wrong';
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Oops!</h2>
                    <p className="text-white/80 text-sm">Something went wrong</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Error Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-red-500" />
                  </div>
                </div>

                {/* Error Message */}
                <div className="text-center">
                  <h3 className="text-lg font-bold text-[#374151] dark:text-white mb-2">
                    {errorMessage}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {this.state.errorInfo?.componentStack ? (
                      <span className="text-xs font-mono block mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack.split('\n').slice(0, 3).join('\n')}
                        {this.state.errorInfo.componentStack.split('\n').length > 3 && '\n...'}
                      </span>
                    ) : (
                      'Please refresh the page or try again later.'
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRefresh}
                    disabled={this.state.isRecovering}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-semibold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {this.state.isRecovering ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Refresh Page
                      </>
                    )}
                  </button>

                  <Link
                    to="/"
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#0D9488] hover:bg-[#0D9488]/5 transition-all duration-300 font-semibold text-[#374151] dark:text-white"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Link>
                </div>

                {/* Error Details (Development only) */}
                {isDevelopment && this.state.error && (
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-auto max-h-32">
                    <p className="text-xs font-mono text-red-600 dark:text-red-400">
                      {this.state.error.toString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  AI Tour Rwanda • {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Support Link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need help?{' '}
                <a 
                  href="mailto:support@aitour.rw" 
                  className="text-[#0D9488] hover:underline font-medium"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;