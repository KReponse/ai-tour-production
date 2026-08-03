import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { forgotPassword } from "../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await forgotPassword(email);

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
  SUCCESS STATE
  ========================= */
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md text-center animate-fade-in">

          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Check Your Email
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Reset instructions sent to{" "}
            <strong>{email}</strong>
          </p>

          <button
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
            className="mb-4 text-sm text-teal-600 hover:underline"
          >
            Try another email
          </button>

          <div>
            <Link
              to="/login"
              className="text-teal-600 font-semibold hover:underline"
            >
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    );
  }

  /* =========================
  FORM UI
  ========================= */
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">

      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Forgot Password?
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Enter your email and we’ll send reset instructions
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">

          {/* ERROR */}
          {error && (
            <div className="mb-4 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-teal-600 to-orange-500 text-white font-semibold rounded-xl hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>

            {/* BACK */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-teal-600 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;