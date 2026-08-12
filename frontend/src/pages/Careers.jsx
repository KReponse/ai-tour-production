// src/pages/Careers.jsx
// ✅ UPDATED - Connected to Careers CMS API
// ✅ REMOVED - Open Positions section

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles,
  Mail,
  Globe,
  Heart,
  Coffee,
  Laptop,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Loader2,
  Users,
  Award,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getCareersContent } from '../services/careersService';

// ─── Icon Mapper ──────────────────────────────────────────────
const iconMap = {
  'Heart': Heart,
  'Coffee': Coffee,
  'Laptop': Laptop,
  'Globe': Globe,
  'Briefcase': Briefcase,
  'Users': Users,
  'Award': Award,
  'Clock': Clock,
  'MapPin': MapPin,
  'DollarSign': DollarSign,
};

const Careers = () => {
  const [careersData, setCareersData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareersContent();
  }, []);

  const fetchCareersContent = async () => {
    try {
      const response = await getCareersContent();
      if (response?.success && response?.data) {
        setCareersData(response.data);
      }
    } catch (error) {
      console.error('Error loading careers content:', error);
    } finally {
      setLoading(false);
    }
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

  const data = careersData || {};
  const hero = data.hero || {};
  const stats = data.statistics || [];
  const benefits = data.benefits || [];
  const cta = data.cta || {};

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 py-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Join Our Team</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            {hero.title || 'Careers at AI Tour Rwanda'}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            {hero.subtitle || 'Build the future of tourism in Rwanda with us. Join a passionate team using AI to transform travel experiences.'}
          </p>
        </div>
      </section>

      {/* STATS */}
      {stats.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.filter(s => s.active !== false).map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800">
              <div className="text-3xl font-black text-[#0D9488]">{stat.value}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* BENEFITS */}
      {benefits.length > 0 && (
        <section>
          <h2 className="text-3xl font-black text-[#374151] dark:text-white text-center mb-8">
            Why Work With Us?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.filter(b => b.active !== false).map((benefit, idx) => {
              const Icon = iconMap[benefit.icon] || Heart;
              return (
                <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800 hover:shadow-xl transition">
                  <div className="w-14 h-14 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-[#0D9488]" />
                  </div>
                  <h3 className="font-bold text-[#374151] dark:text-white">{benefit.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ❌ REMOVED: Open Positions section */}

      {/* CTA */}
      {cta.active !== false && (
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 text-center">
          <Mail className="w-12 h-12 text-[#0D9488] mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-2">
            {cta.title || "Don't see the right role?"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {cta.subtitle || 'Send us your resume and we\'ll keep you in mind for future opportunities.'}
          </p>
          <a
            href={cta.buttonLink || 'mailto:careers@aitour.rw'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-semibold hover:scale-[1.02] transition"
          >
            {cta.buttonText || 'Send Application'}
            <Mail className="w-5 h-5" />
          </a>
        </section>
      )}
    </div>
  );
};

export default Careers;