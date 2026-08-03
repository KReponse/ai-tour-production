// src/pages/Destinations.jsx

import React, { useState } from "react";
import { rwandaDestinations } from "../data/destinations";
import {
  MapPin,
  Star,
  Clock,
  Sparkles,
  Search,
  Users,
  Calendar,
} from "lucide-react";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const categories = [
  "All",
  "Wildlife",
  "Safari",
  "Nature",
  "Relaxation",
  "Culture",
  "City Tours",
];

const Destinations = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filteredDestinations = rwandaDestinations.filter((place) => {
    const matchesCategory =
      selectedCategory === "All" ||
      place.category === selectedCategory;

    const matchesSearch =
      place.name.toLowerCase().includes(search.toLowerCase()) ||
      place.location.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-white">

      {/* ===============================
          HERO - Updated with AI Tour colors
      =============================== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0D9488]/10 blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] dark:text-[#0D9488] text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Explore Rwanda Beautifully
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              Discover
              <span className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] bg-clip-text text-transparent">
                {" "}
                Rwanda
              </span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Explore Rwanda's most beautiful destinations —
              gorilla trekking, safari adventures, lakes,
              culture, and unforgettable experiences.
            </p>
          </div>
        </div>
      </div>

      {/* ===============================
          SEARCH + FILTER
      =============================== */}
      <div className="max-w-7xl mx-auto px-6 mb-10">

        {/* SEARCH */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />

          <input
            type="text"
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition"
          />
        </div>

        {/* FILTERS - Updated with AI Tour colors */}
        <div className="flex gap-3 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ===============================
          DESTINATIONS GRID
      =============================== */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

          {filteredDestinations.map((place) => (
            <div
              key={place.id}
              className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 dark:border-gray-700"
            >

              {/* IMAGE */}
              <div className="relative overflow-hidden h-64">
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500';
                  }}
                />

                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold">
                    {place.category}
                  </span>
                </div>

                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/80 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                  <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                  {place.rating}
                </div>
              </div>

              {/* CONTENT */}
              <div className="p-6">

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-2">
                      {place.name}
                    </h2>

                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-4">
                      <MapPin className="w-4 h-4 text-[#0D9488]" />
                      {place.location}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5 line-clamp-3">
                  {place.description}
                </p>

                {/* ACTIVITIES */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {place.activities.slice(0, 3).map((activity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-[#0D9488]/10 dark:bg-[#0D9488]/20 text-[#0D9488] dark:text-[#0D9488] text-xs font-medium"
                    >
                      {activity}
                    </span>
                  ))}
                  {place.activities.length > 3 && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
                      +{place.activities.length - 3} more
                    </span>
                  )}
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">

                  <div>
                    <p className="text-sm text-gray-500">
                      Starting From
                    </p>

                    <h3 className="text-2xl font-black text-[#0D9488]">
                      ${place.price}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4 text-[#0D9488]" />
                      {place.duration}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      Best: {place.bestTime}
                    </div>
                  </div>
                </div>

                {/* BUTTON - Updated with AI Tour colors */}
                <button className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#0D9488]/30 hover:shadow-[#0D9488]/50">
                  Explore Destination
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredDestinations.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-6">
              <Search className="w-12 h-12 text-[#0D9488]" />
            </div>
            <h2 className="text-3xl font-black text-[#374151] dark:text-white mb-3">
              No destinations found
            </h2>
            <p className="text-gray-500">
              Try searching another place or category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Destinations;