// src/components/common/SearchBar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, TrendingUp, MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

const SearchBar = ({ 
  onSearch, 
  placeholder = 'Search destinations, tours...',
  className = '',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close results on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual search
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock results - replace with actual API
      const mockResults = [
        { id: 1, title: 'Gorilla Trekking Adventure', location: 'Volcanoes National Park', price: 500, type: 'tour' },
        { id: 2, title: 'Lake Kivu Boat Tour', location: 'Lake Kivu', price: 150, type: 'tour' },
        { id: 3, title: 'Nyungwe Forest Canopy Walk', location: 'Nyungwe Forest', price: 200, type: 'tour' },
        { id: 4, title: 'Kigali City Tour', location: 'Kigali', price: 100, type: 'tour' },
      ].filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Save to recent searches
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/explore?search=${encodeURIComponent(query)}`);
      }
      setIsFocused(false);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleResultClick = (result) => {
    navigate(`/tour/${result.id}`);
    setIsFocused(false);
    setQuery('');
    setResults([]);
  };

  const removeRecentSearch = (search) => {
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const showResults = isFocused && (query || recentSearches.length > 0);

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={clsx(
            'w-full pl-12 pr-12 py-3.5 rounded-2xl transition-all duration-200',
            'bg-gray-100 dark:bg-gray-800',
            'border-2',
            isFocused 
              ? 'border-[#0D9488] dark:border-[#0D9488] shadow-lg shadow-[#0D9488]/10'
              : 'border-transparent',
            'focus:outline-none',
            'text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500'
          )}
        />
        
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </form>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-slide-down">
          <div className="max-h-[400px] overflow-y-auto py-2">
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
                <span className="ml-3 text-sm text-gray-500">Searching...</span>
              </div>
            )}

            {/* Results */}
            {!isLoading && results.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Results
                </div>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-start gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
                      {result.type === 'tour' ? (
                        <MapPin className="w-5 h-5 text-[#0D9488]" />
                      ) : (
                        <Star className="w-5 h-5 text-[#F59E0B]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-[#0D9488] transition">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.location}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-[#0D9488] flex-shrink-0">
                      ${result.price}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Recent Searches */}
            {!isLoading && !query && recentSearches.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Searches</span>
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-xs text-red-500 hover:text-red-600 transition"
                  >
                    Clear All
                  </button>
                </div>
                {recentSearches.map((search, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition group"
                  >
                    <button
                      onClick={() => {
                        setQuery(search);
                        performSearch(search);
                      }}
                      className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0D9488] transition"
                    >
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      {search}
                    </button>
                    <button
                      onClick={() => removeRecentSearch(search)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* No Results */}
            {!isLoading && query && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">No results found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your search terms
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !query && recentSearches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">Search for tours, destinations, and more</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;