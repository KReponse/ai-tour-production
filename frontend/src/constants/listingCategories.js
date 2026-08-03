// frontend/src/constants/listingCategories.js
// ✅ NEW - Unified Listing Types and Dynamic Categories

/**
 * Unified Listing Types
 * These are consistent across all business types
 */
export const LISTING_TYPES = [
  { value: 'tour', label: 'Tour' },
  { value: 'experience', label: 'Experience' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'restaurant', label: 'Restaurant / Food Experience' },
  { value: 'guide', label: 'Guide Service' },
  { value: 'adventure', label: 'Adventure Activity' },
  { value: 'event', label: 'Event' },
  { value: 'package', label: 'Package' },
  { value: 'other', label: 'Other' },
];

/**
 * Categories for each Listing Type
 * Each Listing Type has its own category list
 */
export const CATEGORIES_BY_TYPE = {
  tour: [
    'Gorilla Trekking',
    'Safari Tour',
    'City Tour',
    'Cultural Tour',
    'Wildlife Safari',
    'Mountain Hiking',
    'Photography Tour',
    'Family Tour',
    'Honeymoon Package',
    'Eco Tourism',
    'Bird Watching Tour',
    'Night Tour',
    'Private Tour',
    'Group Tour',
    'Self-Drive Tour',
  ],
  experience: [
    'Unique Experience',
    'Adventure Experience',
    'Cultural Experience',
    'Nature Experience',
    'Food Experience',
    'Luxury Experience',
    'Budget Experience',
    'Romantic Experience',
    'Family Experience',
    'Group Experience',
    'Private Experience',
    'Wellness Experience',
    'Spiritual Experience',
    'Photography Experience',
    'Cooking Experience',
    'Art Experience',
  ],
  accommodation: [
    'Luxury Hotel',
    'Boutique Hotel',
    'Business Hotel',
    'Airport Hotel',
    'City Center Hotel',
    'Resort',
    'Serviced Apartment',
    'Eco Lodge',
    'Safari Camp',
    'Mountain Lodge',
    'Forest Lodge',
    'Lake Lodge',
    'Luxury Camp',
    'Budget Camp',
    'Hostel',
    'Guest House',
    'Villa',
    'Cottage',
    'Glamping',
    'Treehouse',
  ],
  transport: [
    'Airport Transfer',
    'Safari Vehicle',
    'Luxury Car Hire',
    'Minibus Transfer',
    'Motorcycle Tour',
    'Boat Transfer',
    'Helicopter Tour',
    '4x4 Safari',
    'Shuttle Service',
    'Private Driver',
    'Self-Drive Rental',
    'Bus Service',
    'Train Travel',
    'Bicycle Tour',
    'Walking Tour',
  ],
  restaurant: [
    'Fine Dining',
    'Local Rwandan Cuisine',
    'Rooftop Restaurant',
    'Farm to Table',
    'Buffet',
    'Brunch Spot',
    'Cultural Dining Experience',
    'Chef\'s Table',
    'Street Food Experience',
    'Cooking Class',
    'Wine & Dine',
    'Coffee Experience',
    'Private Dining',
    'Outdoor Dining',
    'Traditional Meal',
  ],
  guide: [
    'Gorilla Trek Guide',
    'Birding Guide',
    'City Walking Guide',
    'Cultural Interpreter',
    'Mountain Guide',
    'Photography Guide',
    'Night Tour Guide',
    'Custom Private Guide',
    'Safari Guide',
    'Hiking Guide',
    'Wildlife Guide',
    'Fishing Guide',
    'Storytelling Guide',
    'History Guide',
  ],
  adventure: [
    'Hiking Expedition',
    'Mountain Climbing',
    'White Water Rafting',
    'Kayaking',
    'Zip Lining',
    'Bungee Jumping',
    'Paragliding',
    'Scuba Diving',
    'Snorkeling',
    'Horseback Riding',
    'Mountain Biking',
    'Quad Biking',
    'Hot Air Balloon',
    'Helicopter Tour',
    'Canyoning',
    'Caving',
    'Rock Climbing',
    'Skiing',
  ],
  event: [
    'Cultural Show',
    'Music Festival',
    'Team Building',
    'Corporate Event',
    'Wedding Package',
    'Cooking Class',
    'Craft Workshop',
    'Sports Event',
    'Boat Party',
    'Art Exhibition',
    'Networking Event',
    'Conference',
    'Concert',
    'Theatre Performance',
    'Dance Performance',
    'Community Event',
    'Food Festival',
  ],
  package: [
    'Honeymoon Package',
    'Family Package',
    'Group Package',
    'Luxury Package',
    'Adventure Package',
    'Safari Package',
    'Gorilla Trekking Package',
    'Anniversary Package',
    'Birthday Package',
    'Corporate Package',
    'Weekend Getaway',
    'All-Inclusive Package',
    'Romantic Package',
    'Wellness Package',
    'Photography Package',
  ],
  other: [
    'Unique Experience',
    'Community Tourism',
    'Wellness Retreat',
    'Volunteer Tourism',
    'Research Tour',
    'Photography Expedition',
    'Custom Experience',
    'Special Event',
    'Conservation Experience',
    'Educational Tour',
    'Religious Pilgrimage',
    'Medical Tourism',
    'Business Travel',
  ],
};

/**
 * Get categories for a specific listing type
 */
export const getCategoriesForType = (listingType) => {
  return CATEGORIES_BY_TYPE[listingType] || CATEGORIES_BY_TYPE.experience;
};

/**
 * Get all listing types as option objects
 */
export const getListingTypeOptions = () => {
  return LISTING_TYPES;
};

/**
 * Get label for a listing type
 */
export const getListingTypeLabel = (value) => {
  const found = LISTING_TYPES.find((t) => t.value === value);
  return found?.label || value;
};

/**
 * Check if a listing type has "Other" category
 */
export const hasOtherCategory = (listingType) => {
  // All types have "Other" implicitly, but we handle it in the UI
  return true;
};

export default {
  LISTING_TYPES,
  CATEGORIES_BY_TYPE,
  getCategoriesForType,
  getListingTypeOptions,
  getListingTypeLabel,
  hasOtherCategory,
};