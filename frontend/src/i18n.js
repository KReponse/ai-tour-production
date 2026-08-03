// frontend/src/i18n.js
// ✅ FIXED - Added missing translation keys with comprehensive coverage

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ Add all missing translation resources
const resources = {
  en: {
    translation: {
      // Menu items
      'translate-page': 'Translate Page',
      'save-page': 'Save Page',
      'dashboard': 'Dashboard',
      'users': 'Users',
      'listings': 'Listings',
      'bookings': 'Bookings',
      'payments': 'Payments',
      'providers': 'Providers',
      'reviews': 'Reviews',
      'notifications': 'Notifications',
      'settings': 'Settings',
      'footer-settings': 'Footer Settings',
      'settlements': 'Settlements',
      'ledger': 'Ledger',
      'exchange-rates': 'Exchange Rates',
      'featured-experiences': 'Featured Experiences',
      'hero-media': 'Hero Media',
      
      // Common UI
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'save': 'Save',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'edit': 'Edit',
      'view': 'View',
      'search': 'Search',
      'filter': 'Filter',
      'clear': 'Clear',
      
      // Fallback for any missing key
      '_missing': '{{key}}',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    // ✅ Prevent errors for missing keys
    parseMissingKeyHandler: (key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ Missing translation key: ${key}`);
      }
      return key;
    },
    // ✅ React options
    react: {
      useSuspense: false,
    },
  });

export default i18n;