// src/pages/Contact.jsx
// ✅ UPDATED - Connected to Contact CMS API

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle, Loader2, Globe } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { getContactContent } from '../services/contactService';

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
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
      const response = await getContactContent();
      if (response?.success && response?.data) {
        setContactData(response.data);
      }
    } catch (error) {
      console.error('Error loading contact content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitted(true);
    setFormLoading(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white text-center">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-4">
            {hero.title || 'Get in Touch'}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {hero.subtitle || 'Have questions? We\'re here to help you plan your perfect Rwanda adventure.'}
          </p>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* CONTACT INFO */}
        <div className="lg:col-span-1 space-y-4">
          {contactInfo.filter(info => info.active !== false).map((item, idx) => {
            const Icon = iconMap[item.icon] || Mail;
            return (
              <a
                key={idx}
                href={item.href || '#'}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 flex items-center justify-center group-hover:bg-[#0D9488] transition">
                  <Icon className="w-5 h-5 text-[#0D9488] group-hover:text-white transition" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="font-semibold text-[#374151] dark:text-white">{item.value}</p>
                </div>
              </a>
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
                <p className="text-xs text-gray-400">{workingHours.holidays || 'Closed on Public Holidays'}</p>
              </div>
            </div>
          )}
        </div>

        {/* FORM */}
        <div className="lg:col-span-2">
          <Card className="p-8 border border-gray-100 dark:border-gray-800 shadow-xl">
            <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-6">
              Send us a Message
            </h2>

            {submitted && (
              <div className="mb-4 p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#0D9488]" />
                <span className="text-[#0D9488] font-medium">Message sent successfully! We'll get back to you soon.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">Full Name *</label>
                  <Input
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">Email *</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">Subject *</label>
                <Input
                  placeholder="What is this about?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] dark:text-white mb-1.5">Message *</label>
                <textarea
                  rows="5"
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition resize-none"
                  required
                />
              </div>
              <Button type="submit" disabled={formLoading} className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;