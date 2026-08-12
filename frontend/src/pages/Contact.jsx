// src/pages/Contact.jsx
// ✅ COMPLETE FIXED - Connected to Contact CMS API
// ✅ ADDED: Support chat integration - creates support conversation
// ✅ ADDED: Form validation
// ✅ ADDED: Toast notifications
// ✅ ADDED: Better error handling
// ✅ ADDED: Loading states for form submission

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle, Loader2, Globe, AlertCircle, Headphones } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { getContactContent } from '../services/contactService';
import { createSupportConversation } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ─── Icon Mapper ──────────────────────────────────────────────
const iconMap = {
  'Mail': Mail,
  'Phone': Phone,
  'MapPin': MapPin,
  'Clock': Clock,
  'Globe': Globe,
};

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [conversationCreated, setConversationCreated] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    fetchContactContent();
  }, []);

  const fetchContactContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContactContent();
      if (response?.success && response?.data) {
        setContactData(response.data);
      } else {
        setError('Failed to load contact information');
        toast.error('Failed to load contact information');
      }
    } catch (error) {
      console.error('Error loading contact content:', error);
      setError(error.message || 'Failed to load contact information');
      toast.error('Failed to load contact information');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 3) {
      errors.subject = 'Subject must be at least 3 characters';
    }
    
    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Handle form submission - Creates support conversation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ Validate before submitting
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    // ✅ Check if user is logged in
    if (!user) {
      toast.error('Please login to send a message. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    setFormLoading(true);
    
    try {
      // ✅ Determine conversation type based on user role
      const conversationType = user.role === 'provider' ? 'provider_support' : 'traveler_support';
      
      // ✅ Create support conversation with the message
      const fullMessage = `
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}
      `.trim();

      const response = await createSupportConversation(fullMessage, conversationType);
      
      if (response.success) {
        setSubmitted(true);
        setConversationCreated(true);
        setConversationId(response.data?._id);
        
        toast.success('Message sent successfully! An admin will respond shortly.');
        
        setFormData({ name: '', email: '', subject: '', message: '' });
        setFormErrors({});
        
        // ✅ Offer to navigate to chat
        setTimeout(() => {
          setConversationCreated(false);
        }, 8000);
        
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        toast.error(response.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error?.message || 'Failed to send message. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ✅ Clear error on input change
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  // ✅ Navigate to chat
  const goToChat = () => {
    if (conversationId) {
      const chatPath = user?.role === 'provider' ? '/provider/chat' : '/chat';
      navigate(`${chatPath}/${conversationId}`);
    } else {
      const chatPath = user?.role === 'provider' ? '/provider/chat' : '/chat';
      navigate(chatPath);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading contact information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
          Failed to Load Contact Information
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={fetchContactContent}
          className="px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const data = contactData || {};
  const hero = data.hero || {};
  const contactInfo = data.contactInfo || [];
  const workingHours = data.workingHours || {};

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-8 md:p-12 text-white text-center">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-6xl font-black mb-4">
            {hero.title || 'Get in Touch'}
          </h1>
          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto">
            {hero.subtitle || 'Have questions? We\'re here to help you plan your perfect Rwanda adventure.'}
          </p>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* CONTACT INFO */}
        <div className="lg:col-span-1 space-y-4">
          {contactInfo.filter(info => info.active !== false).map((item, idx) => {
            const Icon = iconMap[item.icon] || Mail;
            const isLink = item.href && item.href !== '#';
            const Wrapper = isLink ? 'a' : 'div';
            
            return (
              <Wrapper
                key={idx}
                href={item.href || '#'}
                className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition group ${
                  isLink ? 'hover:border-[#0D9488]/30 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 flex items-center justify-center group-hover:bg-[#0D9488] transition flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#0D9488] group-hover:text-white transition" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="font-semibold text-[#374151] dark:text-white truncate">
                    {item.value}
                  </p>
                </div>
              </Wrapper>
            );
          })}

          {/* Working Hours */}
          {workingHours.enabled !== false && (
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-[#0D9488]" />
                <span className="font-semibold text-[#374151] dark:text-white">Working Hours</span>
              </div>
              <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <p>{workingHours.weekdays || 'Mon-Fri: 8AM - 6PM'}</p>
                <p>{workingHours.weekends || 'Sat-Sun: 9AM - 4PM'}</p>
                {workingHours.holidays && (
                  <p className="text-xs text-gray-400">{workingHours.holidays}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="lg:col-span-2">
          <Card className="p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl">
            <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-6">
              Send us a Message
            </h2>

            {/* ✅ Conversation Created Message */}
            {conversationCreated && (
              <div className="mb-6 p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                  <span className="text-[#0D9488] font-medium">
                    Your message has been sent to support!
                  </span>
                </div>
                <button
                  onClick={goToChat}
                  className="mt-2 sm:mt-0 px-4 py-2 rounded-xl bg-[#0D9488] text-white text-sm font-medium hover:bg-[#0D9488]/80 transition flex items-center gap-2 ml-auto"
                >
                  <Headphones className="w-4 h-4" />
                  View Conversation
                </button>
              </div>
            )}

            {submitted && !conversationCreated && (
              <div className="mb-6 p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center gap-3 animate-fade-in">
                <CheckCircle className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                <span className="text-[#0D9488] font-medium">
                  Message sent successfully! We'll get back to you soon.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={formErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
                    required
                    disabled={formLoading}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={formErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
                    required
                    disabled={formLoading}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="What is this about?"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={formErrors.subject ? 'border-red-500 focus:ring-red-500' : ''}
                  required
                  disabled={formLoading}
                />
                {formErrors.subject && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.subject}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="5"
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className={`w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition resize-none ${
                    formErrors.message ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  required
                  disabled={formLoading}
                />
                {formErrors.message && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.message}</p>
                )}
              </div>
              
              {/* ✅ Login notice */}
              {!user && (
                <div className="p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#B45309] dark:text-[#F59E0B]">
                    You are not logged in. Please <button 
                      onClick={() => navigate('/login')} 
                      className="font-bold hover:underline"
                    >login</button> to send a message and get real-time support.
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={formLoading || !user} 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                Messages are sent directly to our support team. You'll receive real-time responses in the chat.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;