// src/pages/DestinationDetails.jsx

import React, { useState } from "react";
import { 
  Star,
  MapPin,
  Clock,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  CalendarDays,
  Users,
  Wifi,
  Coffee,
  Car,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import { Link, useNavigate, useParams } from "react-router-dom";

import Card, {
  CardImage,
  CardContent
} from "../components/ui/Card";

import Button from "../components/ui/Button";

import {
  rwandaDestinations as destinations
} from "../data/destinations";

import LocationMap from "../components/ui/LocationMap";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ===============================
// AMENITY ICONS
// ===============================
const amenityIcons = {
  wifi: Wifi,
  breakfast: Coffee,
  transport: Car,
  support: ShieldCheck
};

// ===============================
// COMPONENT
// ===============================
const DestinationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const destination = destinations.find(
    (item) => item.id === Number(id)
  );

  const [currentImage, setCurrentImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // ===============================
  // NOT FOUND
  // ===============================
  if (!destination) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-[#374151] dark:text-white mb-4">
          Destination Not Found
        </h1>
        <p className="text-gray-500 mb-6">
          The destination does not exist.
        </p>
        <Link to="/explore">
          <Button>Back To Explore</Button>
        </Link>
      </div>
    );
  }

  // ===============================
  // EXTENDED DATA
  // ===============================
  const extendedData = {
    reviews: 1243,
    region: "Rwanda",
    bestTime: destination.bestTime || "June - September",
    language: "English & Kinyarwanda",
    travelers: "2 - 10 People",
    highlights: [
      "Breathtaking landscapes",
      "Authentic cultural experiences",
      "Professional local guides",
      "Safe memorable adventure"
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrival & Relaxation",
        activities: [
          "Airport welcome",
          "Hotel check-in",
          "Kigali orientation",
          "Traditional dinner"
        ]
      },
      {
        day: 2,
        title: "Adventure Experience",
        activities: [
          "Guided exploration",
          "Local restaurant lunch",
          "Photography session",
          "Sunset viewing"
        ]
      },
      {
        day: 3,
        title: "Culture & Departure",
        activities: [
          "Cultural visit",
          "Local market",
          "Farewell lunch",
          "Airport transfer"
        ]
      }
    ]
  };

  // ===============================
  // IMAGES
  // ===============================
  const images = destination.images || [
    destination.image,
    destination.image,
    destination.image
  ];

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-5 space-y-6 pb-32 md:pb-8">

      {/* ===============================
          NAVIGATION
      =============================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-lg transition border border-gray-100 dark:border-gray-800"
        >
          <ArrowLeft className="w-4 h-4 text-[#0D9488]" />
          <span className="text-[#374151] dark:text-white">Back</span>
        </button>

        <div className="text-sm text-gray-500 flex gap-2">
          <Link to="/" className="hover:text-[#0D9488] transition">Home</Link>
          <span>/</span>
          <Link to="/explore" className="hover:text-[#0D9488] transition">Explore</Link>
          <span>/</span>
          <span className="text-[#374151] dark:text-white font-semibold truncate max-w-[200px]">
            {destination.name}
          </span>
        </div>
      </div>

      {/* ===============================
          HERO IMAGE
      =============================== */}
      <div className="relative rounded-3xl overflow-hidden h-[320px] md:h-[500px] group">
        <img
          src={images[currentImage]}
          alt={destination.name}
          className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* IMAGE BUTTONS */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-900/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition hover:scale-110 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 text-[#374151] dark:text-white" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-900/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition hover:scale-110 shadow-lg"
            >
              <ChevronRight className="w-5 h-5 text-[#374151] dark:text-white" />
            </button>
          </>
        )}

        {/* ACTION BUTTONS */}
        <div className="absolute top-4 right-4 flex gap-3">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-3 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-lg hover:scale-110 transition backdrop-blur-sm"
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? "fill-red-500 text-red-500" : "text-[#374151] dark:text-white"
              }`}
            />
          </button>
          <button
            onClick={() => {
              navigator.share?.({
                title: destination.name,
                text: `Check out ${destination.name} in Rwanda!`,
                url: window.location.href,
              }).catch(() => {});
            }}
            className="p-3 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-lg hover:scale-110 transition backdrop-blur-sm"
          >
            <Share2 className="w-5 h-5 text-[#0D9488]" />
          </button>
        </div>

        {/* HERO CONTENT */}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-medium">
              Popular Destination
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#F59E0B] text-white font-bold text-sm">
              <Star className="w-3 h-3 fill-current" />
              {destination.rating}
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-2">
            {destination.name}
          </h1>

          <div className="flex items-center text-white/90">
            <MapPin className="w-5 h-5 mr-2" />
            {extendedData.region}
          </div>
        </div>
      </div>

      {/* ===============================
          THUMBNAILS
      =============================== */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`
                w-20 h-16 md:w-24 md:h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0
                ${currentImage === index ? "border-[#0D9488] scale-105" : "border-transparent"}
              `}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ===============================
          MAIN CONTENT GRID
      =============================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT SIDE */}
        <div className="lg:col-span-2 space-y-8">

          {/* ABOUT */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-black text-[#374151] dark:text-white mb-4">
              About This Destination
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {destination.description}
            </p>
          </Card>

          {/* QUICK INFO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5 text-center rounded-2xl border border-gray-100 dark:border-gray-800">
              <Clock className="mx-auto mb-2 text-[#0D9488]" />
              <p className="font-bold dark:text-white">{destination.duration}</p>
              <span className="text-xs text-gray-500">Duration</span>
            </Card>

            <Card className="p-5 text-center rounded-2xl border border-gray-100 dark:border-gray-800">
              <CalendarDays className="mx-auto mb-2 text-[#F59E0B]" />
              <p className="font-bold dark:text-white">{extendedData.bestTime}</p>
              <span className="text-xs text-gray-500">Best Time</span>
            </Card>

            <Card className="p-5 text-center rounded-2xl border border-gray-100 dark:border-gray-800">
              <Users className="mx-auto mb-2 text-[#374151] dark:text-gray-400" />
              <p className="font-bold dark:text-white">{extendedData.travelers}</p>
              <span className="text-xs text-gray-500">Group Size</span>
            </Card>

            <Card className="p-5 text-center rounded-2xl border border-gray-100 dark:border-gray-800">
              <Sparkles className="mx-auto mb-2 text-[#0D9488]" />
              <p className="font-bold dark:text-white text-sm">{extendedData.language}</p>
              <span className="text-xs text-gray-500">Language</span>
            </Card>
          </div>

          {/* HIGHLIGHTS */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-black dark:text-white mb-5">Highlights</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {extendedData.highlights.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800"
                >
                  <Star className="w-5 h-5 text-[#F59E0B] fill-current" />
                  <span className="dark:text-gray-200">{item}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ITINERARY */}
          <Card className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-black dark:text-white mb-6">
              Suggested Itinerary
            </h2>
            <div className="space-y-5">
              {extendedData.itinerary.map((day) => (
                <div
                  key={day.day}
                  className="border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:border-[#0D9488] transition"
                >
                  <h3 className="font-black text-lg dark:text-white mb-3">
                    Day {day.day}: {day.title}
                  </h3>
                  <div className="space-y-2">
                    {day.activities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start text-gray-600 dark:text-gray-300"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#0D9488] mt-2 mr-3" />
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* LOCATION MAP */}
          <LocationMap
            destinationName={destination.name}
            address={destination.address || `${destination.name}, Rwanda`}
          />

          {/* AI TRAVEL TIP */}
          <Card className="p-6 rounded-3xl bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 border border-[#0D9488]/20">
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="text-white w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-white mb-2">
                  AI Travel Tip
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Best time to visit {destination.name} is during{" "}
                  {extendedData.bestTime}. AI Tour recommends booking early for the best experience.
                </p>
              </div>
            </div>
          </Card>

          {/* AI RECOMMENDATION */}
          <Card className="p-6 rounded-3xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white border-0">
            <h2 className="text-2xl font-black mb-3">
              AI Recommendation
            </h2>
            <p className="leading-relaxed">
              Based on traveler interests, AI Tour recommends this destination
              for adventure lovers, photographers, honeymoon travelers,
              and luxury Rwanda experiences.
            </p>
          </Card>

          {/* RELATED DESTINATIONS */}
          <section>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-black dark:text-white">
                You May Also Like
              </h2>
              <Link to="/explore" className="text-[#0D9488] font-bold hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {destinations
                .filter((item) => item.id !== destination.id)
                .slice(0, 2)
                .map((item) => (
                  <Link key={item.id} to={`/destination/${item.id}`}>
                    <Card hover className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                      <CardImage
                        src={item.image}
                        alt={item.name}
                        className="h-52 object-cover"
                      />
                      <CardContent className="p-4">
                        <h3 className="font-black text-lg dark:text-white">
                          {item.name}
                        </h3>
                        <div className="flex items-center mt-2">
                          <Star className="w-4 h-4 text-[#F59E0B] fill-current" />
                          <span className="ml-1 text-[#374151] dark:text-white">{item.rating}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </section>
        </div>

        {/* ===============================
            BOOKING SIDEBAR
        =============================== */}
        <div className="lg:sticky lg:top-24 h-fit">
          <Card className="p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">Starting From</p>
            <h2 className="text-4xl font-black text-[#0D9488]">
              ${destination.price}
            </h2>
            <p className="text-gray-500 mb-6">per person</p>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <span className="text-gray-500">Duration</span>
                <b className="dark:text-white">{destination.duration}</b>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <span className="text-gray-500">Best Time</span>
                <b className="dark:text-white">{extendedData.bestTime}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rating</span>
                <b className="dark:text-white">{destination.rating} ⭐</b>
              </div>
            </div>

            {/* AMENITIES */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "WiFi", icon: "wifi" },
                { label: "Breakfast", icon: "breakfast" },
                { label: "Transport", icon: "transport" },
                { label: "Support", icon: "support" }
              ].map((item, index) => {
                const Icon = amenityIcons[item.icon];
                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4 text-[#0D9488]" />
                    <span className="text-sm dark:text-white">{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <Link to={`/booking/${destination.id}`}>
                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
                  Book Now
                </Button>
              </Link>

              <Link
                to="/custom-request"
                state={{ destination: destination.name }}
              >
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10"
                >
                  ✨ Create AI Trip
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ===============================
          MOBILE BOOKING BAR
      =============================== */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">From</p>
            <p className="text-xl font-black text-[#0D9488]">${destination.price}</p>
          </div>
          <Link to={`/booking/${destination.id}`} className="flex-1">
            <Button className="w-full h-11 bg-gradient-to-r from-[#0D9488] to-[#F59E0B]">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DestinationDetails;