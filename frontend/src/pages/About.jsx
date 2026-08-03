// src/pages/About.jsx
// ✅ UPDATED - Connected to About CMS API

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Users, 
  Award, 
  Globe, 
  Heart,
  Target,
  Shield,
  TrendingUp,
  MapPin,
  Star,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getAboutContent } from '../services/aboutService';

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
  'Sparkles': Sparkles,
  'Users': Users,
  'Award': Award,
  'Globe': Globe,
  'Heart': Heart,
  'Target': Target,
  'Shield': Shield,
  'TrendingUp': TrendingUp,
  'MapPin': MapPin,
  'Star': Star,
  'CheckCircle': CheckCircle,
};

// ─── Fallback Data ──────────────────────────────────────────────
const getFallbackData = () => ({
  hero: {
    title: 'Smart Travel for Smart People',
    subtitle: 'AI Tour Rwanda is revolutionizing the way travelers discover and experience Rwanda.',
    description: 'We combine artificial intelligence with local expertise to create unforgettable travel experiences in Rwanda.',
    image: '',
  },
  statistics: [
    { value: '10K+', label: 'Happy Travelers', icon: 'Users' },
    { value: '500+', label: 'Tours Available', icon: 'MapPin' },
    { value: '4.9', label: 'Average Rating', icon: 'Star' },
    { value: '98%', label: 'Satisfaction Rate', icon: 'TrendingUp' },
  ],
  values: [
    {
      title: 'Innovation',
      description: 'Using AI to revolutionize travel planning and experiences.',
      icon: 'Sparkles',
    },
    {
      title: 'Trust',
      description: 'Verified providers and secure bookings you can rely on.',
      icon: 'Shield',
    },
    {
      title: 'Passion',
      description: 'Showcasing the beauty of Rwanda with love and care.',
      icon: 'Heart',
    },
    {
      title: 'Sustainability',
      description: 'Promoting responsible and eco-friendly tourism.',
      icon: 'Globe',
    },
  ],
  team: [
    { name: 'Alex M.', role: 'CEO & Founder', image: '' },
    { name: 'Grace K.', role: 'Head of Tourism', image: '' },
    { name: 'David R.', role: 'AI Engineer', image: '' },
    { name: 'Sarah M.', role: 'Customer Experience', image: '' },
  ],
  cta: {
    title: 'Ready to Explore Rwanda?',
    subtitle: 'Join thousands of travelers discovering Rwanda with AI Tour.',
    buttonText: 'Start Exploring',
    buttonLink: '/explore',
  },
});

const About = () => {
  const [aboutData, setAboutData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const response = await getAboutContent();
      if (response?.success && response?.data) {
        setAboutData(response.data);
      } else {
        setAboutData(getFallbackData());
      }
    } catch (error) {
      console.error('Error loading about content:', error);
      setAboutData(getFallbackData());
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

  const data = aboutData || getFallbackData();
  const stats = data.statistics || data.stats || [];
  const values = data.values || [];
  const team = data.team || [];
  const cta = data.cta || {};
  const hero = data.hero || {};

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto px-4 py-8">
      
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-12 text-white text-center">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">About AI Tour</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            {hero.title || 'Smart Travel'}
            <span className="block text-[#F59E0B]">{hero.subtitle || 'for Smart People'}</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {hero.description || 'AI Tour Rwanda is revolutionizing the way travelers discover and experience Rwanda.'}
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.filter(s => s.active !== false).map((stat, idx) => {
          const Icon = iconMap[stat.icon] || Users;
          return (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition">
              <div className="w-14 h-14 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-7 h-7 text-[#0D9488]" />
              </div>
              <h3 className="text-3xl font-black text-[#374151] dark:text-white">{stat.value}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </section>

      {/* OUR VALUES */}
      <section>
        <h2 className="text-3xl font-black text-[#374151] dark:text-white text-center mb-8">
          Our Values
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {values.filter(v => v.active !== false).map((value, idx) => {
            const Icon = iconMap[value.icon] || Sparkles;
            return (
              <Card key={idx} className="p-6 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center text-white mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#374151] dark:text-white">{value.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{value.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* TEAM */}
      <section>
        <h2 className="text-3xl font-black text-[#374151] dark:text-white text-center mb-8">
          Meet the Team
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.filter(m => m.active !== false).map((member, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center border border-gray-100 dark:border-gray-800 hover:shadow-xl transition">
              <img 
                src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D9488&color=fff&size=128`} 
                alt={member.name} 
                className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-[#0D9488]" 
              />
              <h3 className="font-bold text-[#374151] dark:text-white">{member.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {cta.active !== false && (
        <section className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-black mb-4">
            {cta.title || 'Ready to Explore Rwanda?'}
          </h2>
          <p className="text-white/90 mb-6">
            {cta.subtitle || 'Join thousands of travelers discovering Rwanda with AI Tour.'}
          </p>
          <Link to={cta.buttonLink || '/explore'}>
            <Button className="bg-white text-[#0D9488] hover:scale-105 transition">
              {cta.buttonText || 'Start Exploring'}
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
};

export default About;