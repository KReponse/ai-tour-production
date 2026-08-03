// src/components/ui/LocationMap.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Maximize2, 
  Minimize2, 
  Navigation, 
  Layers, 
  Map as MapIcon,
  Satellite,
  Loader2,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import Card from './Card';
import Button from './Button';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const LocationMap = ({ destinationName, latitude, longitude, address }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [hasError, setHasError] = useState(false);
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  const defaultCoordinates = {
    'Volcanoes National Park': { lat: -1.4667, lng: 29.5333 },
    'Lake Kivu': { lat: -2.0474, lng: 29.2583 },
    'Nyungwe National Park': { lat: -2.4844, lng: 29.2732 },
    'Kigali City': { lat: -1.9441, lng: 30.0619 },
    'Akagera National Park': { lat: -1.6357, lng: 30.7345 },
    'Gisenyi': { lat: -1.7028, lng: 29.2564 },
    'Musanze': { lat: -1.4984, lng: 29.6347 },
  };

  const coords = {
    lat: latitude || defaultCoordinates[destinationName]?.lat || -1.9441,
    lng: longitude || defaultCoordinates[destinationName]?.lng || 30.0619,
  };

  const getMapUrl = () => {
    const baseUrl = 'https://www.google.com/maps/embed/v1/place';
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
    
    if (apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      return `${baseUrl}?key=${apiKey}&q=${encodeURIComponent(destinationName + ', Rwanda')}&maptype=${mapType}&zoom=13`;
    }
    
    return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.5!2d${coords.lng}!3d${coords.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${coords.lat},${coords.lng}!5e0!3m2!1sen!2srw!4v1!5m2!1sen!2srw`;
  };

  const getDirectionsUrl = () => {
    if (userLocation) {
      return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${coords.lat},${coords.lng}`;
    }
    return `https://www.google.com/maps/dir//${coords.lat},${coords.lng}`;
  };

  const getUserLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
          setShowDirectionsPanel(true);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
          setShowDirectionsPanel(true);
        }
      );
    } else {
      setLocationLoading(false);
      setShowDirectionsPanel(true);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
  };

  return (
    <>
      <Card className="p-4 md:p-6 rounded-2xl md:rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800">
        {/* Header - Updated with AI Tour colors */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-xl md:text-2xl font-bold dark:text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-[#0D9488] rounded-full"></span>
            Location Map
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Map Type Toggle - Updated colors */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setMapType('roadmap')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  mapType === 'roadmap'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-[#0D9488]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Map view"
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  mapType === 'satellite'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-[#0D9488]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Satellite view"
              >
                <Satellite className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div 
          ref={containerRef}
          className={`relative rounded-xl md:rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 transition-all duration-300 ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
          }`}
          style={{ height: isFullscreen ? '100vh' : '350px' }}
        >
          {/* Loading Skeleton - Updated colors */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <Loader2 className="w-8 h-8 text-[#0D9488] animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading map...</p>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-semibold dark:text-white mb-1">Unable to load map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please check your connection</p>
              <Button
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  setTimeout(() => {
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeRef.current.src;
                    }
                  }, 500);
                }}
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Map Iframe */}
          <iframe
            ref={iframeRef}
            title={`${destinationName} location map`}
            src={getMapUrl()}
            className="w-full h-full border-0 transition-opacity duration-300"
            loading="lazy"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ opacity: isLoading || hasError ? 0 : 1 }}
          />

          {/* Location Marker Overlay - Updated colors */}
          {!isLoading && !hasError && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
              <div className="relative">
                <div className="absolute -inset-4 bg-[#0D9488]/20 rounded-full animate-ping"></div>
                <div className="absolute -inset-2 bg-[#0D9488]/30 rounded-full animate-pulse"></div>
                <MapPin className="w-6 h-6 text-[#0D9488] drop-shadow-lg relative z-10" />
              </div>
            </div>
          )}

          {/* Info Badge */}
          {!isLoading && !hasError && (
            <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{destinationName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Map Actions Footer - Updated colors */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {/* Directions Button - Updated colors */}
          <button
            onClick={getUserLocation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#0f766e] text-white hover:scale-[1.02] transition-all duration-300 group shadow-md shadow-[#0D9488]/25"
          >
            {locationLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            )}
            <span className="text-sm font-medium">Get Directions</span>
          </button>

          {/* Open in Google Maps Button - Updated colors */}
          <button
            onClick={openInGoogleMaps}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#0D9488] dark:hover:border-[#0D9488] hover:bg-[#0D9488]/5 transition-all duration-300 group"
          >
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform group-hover:text-[#0D9488]" />
            <span className="text-sm font-medium dark:text-white group-hover:text-[#0D9488] transition">Open in Google Maps</span>
          </button>
        </div>

        {/* Address Info */}
        {address && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📍 {address}
            </p>
          </div>
        )}
      </Card>

      {/* Directions Panel Modal - Updated colors */}
      {showDirectionsPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDirectionsPanel(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#0D9488]" />
                Get Directions
              </h3>
              <button onClick={() => setShowDirectionsPanel(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userLocation ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/20">
                  <p className="text-sm text-[#0D9488] dark:text-[#0D9488]">
                    📍 Your location detected
                  </p>
                </div>
                <Button
                  onClick={() => window.open(getDirectionsUrl(), '_blank')}
                  className="w-full bg-gradient-to-r from-[#0D9488] to-[#F59E0B] shadow-lg shadow-[#0D9488]/30"
                >
                  Open Directions in Google Maps
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 border border-[#F59E0B]/20">
                  <p className="text-sm text-[#F59E0B]">
                    ⚠️ Unable to get your location. Please enter your address manually.
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter your starting address"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent"
                    id="startAddress"
                  />
                  <Button
                    onClick={() => {
                      const address = document.getElementById('startAddress').value;
                      if (address) {
                        window.open(`https://www.google.com/maps/dir/${encodeURIComponent(address)}/${coords.lat},${coords.lng}`, '_blank');
                      }
                    }}
                    className="bg-[#0D9488] text-white hover:bg-[#0D9488]/80"
                  >
                    Go
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                Destination: {destinationName}<br />
                Coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationMap;