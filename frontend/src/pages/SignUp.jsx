// src/pages/SignUp.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('traveler');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'Rwanda',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Handle signup logic
    console.log('Signup:', { ...formData, role });
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* HEADER - Updated with AI Tour colors */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0D9488]/30">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
            Create Account
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            Join AI Tour and start your adventure
          </p>
        </div>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-xl rounded-3xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NAME */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    className="pl-10 focus:ring-[#0D9488]"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 focus:ring-[#0D9488]"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* PHONE */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="+250 7XX XXX XXX"
                    className="pl-10 focus:ring-[#0D9488]"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password (min 6 chars)"
                    className="pl-10 pr-10 focus:ring-[#0D9488]"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 focus:ring-[#0D9488]"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* ROLE SELECTION - Updated with AI Tour colors */}
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('traveler')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                      role === 'traveler'
                        ? 'border-[#0D9488] bg-[#0D9488]/10 dark:bg-[#0D9488]/20 shadow-md shadow-[#0D9488]/20 scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-[#0D9488]/50'
                    }`}
                  >
                    <User className={`mx-auto mb-1.5 w-6 h-6 ${role === 'traveler' ? 'text-[#0D9488]' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${role === 'traveler' ? 'text-[#0D9488]' : 'text-gray-600 dark:text-gray-400'}`}>
                      Traveler
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                      role === 'provider'
                        ? 'border-[#F59E0B] bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 shadow-md shadow-[#F59E0B]/20 scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-[#F59E0B]/50'
                    }`}
                  >
                    <Building2 className={`mx-auto mb-1.5 w-6 h-6 ${role === 'provider' ? 'text-[#F59E0B]' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${role === 'provider' ? 'text-[#F59E0B]' : 'text-gray-600 dark:text-gray-400'}`}>
                      Provider
                    </p>
                  </button>
                </div>
                {role === 'provider' && (
                  <div className="mt-2 p-3 rounded-xl bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 border border-[#F59E0B]/20 text-xs text-[#F59E0B] flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Provider accounts require admin approval before publishing tours.</span>
                  </div>
                )}
              </div>

              {/* SUBMIT - Updated with AI Tour colors */}
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full h-14 rounded-2xl text-lg bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            {/* SIGN IN LINK - Updated with AI Tour colors */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <Link to="/login" className="text-[#0D9488] hover:text-[#0D9488]/80 font-semibold transition">
                  Sign In →
                </Link>
              </p>
            </div>

            {/* Trust Badge */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                  Secure
                </span>
                <span>•</span>
                <span>🔒 Encrypted</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                  AI Powered
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;