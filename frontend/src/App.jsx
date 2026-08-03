// src/App.jsx
// ✅ COMPLETE FIXED - Added CurrencyProvider wrapper
// ✅ Removed duplicate AdminPayments import
// ✅ ADDED: Settlements, Ledger, Exchange Rates routes
// ✅ ADDED: Hero Media route
// ❌ REMOVED: Featured Experiences (completely removed)

import React, { useState } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

// ✅ IMPORT CurrencyProvider
import { CurrencyProvider } from './contexts/CurrencyContext';

import MainLayout from './components/layout/Layout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

import FloatingAIButton from './components/ui/FloatingAIButton';
import AIWidget from './components/ai/AIWidget';

// User Pages
import Home from './pages/Home';
import Dashboard from "./pages/Dashboard";
import Explore from './pages/Explore';
import AIPlanner from './pages/AIPlanner';
import Booking from './pages/Booking';
import Trips from './pages/Trips';
import Reviews from './pages/Reviews';
import Profile from './pages/Profile';
import UserNotifications from './pages/Notifications';
import DestinationDetails from './pages/DestinationDetails';
import TripResults from './pages/TripResults';
import RequestTrip from './pages/RequestTrip';
import Payment from './pages/Payment';
import EditProfile from './pages/EditProfile';
import TourDetails from './pages/TourDetails';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import MyBookings from './pages/MyBookings';
import AIChat from './pages/AIChat';
import CustomRequest from './pages/CustomRequest';
import MyReviews from './pages/MyReviews';
import BookingDetails from './pages/BookingDetails';
import TripDetails from './pages/TripDetails';
import PaymentPage from './pages/PaymentPage';
import ReviewDetails from './pages/ReviewDetails';

// ✅ IMPORT Review Page
import Review from './pages/Review';

// ✅ Provider Notifications
import ProviderNotifications from './pages/provider/ProviderNotifications';

// ✅ Provider Booking Details
import ProviderBookingDetails from './pages/provider/BookingDetails';

// ✅ PAYMENT PAGES
import TravelerPayments from './pages/traveler/Payments';
import TravelerPaymentDetails from './pages/traveler/PaymentDetails';
import ProviderPayments from './pages/provider/Payments';
import ProviderPaymentDetails from './pages/provider/PaymentDetails';
import AdminPayments from './pages/admin/AdminPayments';
import AdminPaymentDetails from './pages/admin/PaymentDetails';

// ✅ ADMIN FINANCIAL PAGES
import AdminSettlements from './pages/admin/Settlements';
import AdminLedger from './pages/admin/Ledger';
import AdminExchangeRates from './pages/admin/ExchangeRates';

// ✅ ADMIN HERO MEDIA
import HeroMedia from './pages/admin/HeroMedia';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Footer Pages
import About from './pages/About';
import Contact from './pages/Contact';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import Careers from './pages/Careers';
import Blog from './pages/Blog';
import FAQs from './pages/FAQs';
import PublicProfile from './pages/PublicProfile';

// Admin Pages
import Users from './pages/admin/Users';
import Tours from './pages/admin/Tours';
import Providers from './pages/admin/Providers';
import AdminRequests from './pages/admin/Requests';
import AdminNotifications from './pages/admin/Notifications';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProviderRequests from './pages/admin/ProviderRequests';
import AdminReviews from './pages/admin/Reviews';
import ProviderRequestDetails from "./pages/admin/ProviderRequestDetails";
import ManagementListings from './pages/admin/ManagementListings';

// ✅ Admin Booking Pages
import AdminBookings from './pages/admin/AdminBookings';
// ✅ FIXED: Admin Settings - Only import once
import AdminSettings from './pages/admin/Settings';
import FooterSettings from './pages/admin/FooterSettings';

// Provider Pages
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderRequests from './pages/provider/Requests';
import Bookings from './pages/provider/Bookings';
import Travelers from './pages/provider/Travelers';
import Analytics from './pages/provider/Analytics';
import Earnings from './pages/provider/Earnings';
import ProviderProfileDashboard from './pages/provider/Profile';
import ProviderPublicProfile from './pages/ProviderProfile';
import ProviderSettings from './pages/provider/Settings';
import AddTour from './pages/provider/AddTour';
import MyTours from './pages/provider/MyTours';
import EditTour from './pages/provider/EditTour';
import ProviderStatus from './pages/provider/ProviderStatus';
import ProviderPending from './pages/ProviderPending';
import ProviderRequest from './pages/ProviderRequest';
import ProviderReviews from './pages/provider/Reviews';
import ProfileEdit from './pages/provider/ProfileEdit';

// Listing Pages (Primary)
import ListingDetails from './pages/ListingDetails';
import MyListings from './pages/provider/MyListings';
import AddListing from './pages/provider/AddListing';
import EditListing from './pages/provider/EditListing';

import ProtectedRoute from './routes/ProtectedRoute';
import AboutSettings from './pages/admin/AboutSettings';
import ContactSettings from './pages/admin/ContactSettings';
import FaqSettings from './pages/admin/FaqSettings';
import HelpSettings from './pages/admin/HelpSettings';
import PrivacySettings from './pages/admin/PrivacySettings';
import TermsSettings from './pages/admin/TermsSettings';
import CareersSettings from './pages/admin/CareersSettings';
import BlogSettings from './pages/admin/BlogSettings';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  return (
    // ✅ WRAP EVERYTHING WITH CURRENCY PROVIDER
    <CurrencyProvider>
      <Routes>
        {/* ================= USER SITE ================= */}
        <Route
          element={
            <MainLayout>
              <Outlet />
            </MainLayout>
          }
        >
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/destination/:id" element={<DestinationDetails />} />
          
          {/* Auth Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          {/* Footer & Legal Pages */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/provider/:providerId" element={<ProviderPublicProfile />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/reviews/:reviewId" element={<ReviewDetails />} />

          {/* PROTECTED ROUTES */}
          <Route path="/ai-planner" element={<ProtectedRoute><AIPlanner /></ProtectedRoute>} />
          <Route path="/booking/:listingId" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/booking-details/:bookingId" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
          <Route path="/trip/:bookingId" element={<ProtectedRoute><TripDetails /></ProtectedRoute>} />
          <Route path="/payment/:bookingId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/review/:bookingId" element={<ProtectedRoute><Review /></ProtectedRoute>} />
          
          <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><UserNotifications /></ProtectedRoute>} />
          <Route path="/provider/request" element={<ProtectedRoute allowedRoles={["traveler"]}><ProviderRequest /></ProtectedRoute>} />
          <Route path="/trip-results" element={<ProtectedRoute><TripResults /></ProtectedRoute>} />
          <Route path="/request-trip" element={<ProtectedRoute><RequestTrip /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/custom-request" element={<ProtectedRoute><CustomRequest /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          
          <Route path="/tour/:id" element={<TourDetails />} />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/my-reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />

          {/* ✅ TRAVELER PAYMENT PAGES */}
          <Route path="/traveler/payments" element={<ProtectedRoute><TravelerPayments /></ProtectedRoute>} />
          <Route path="/traveler/payments/:paymentId" element={<ProtectedRoute><TravelerPaymentDetails /></ProtectedRoute>} />

          {/* Legacy Payment pages */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
        </Route>

        {/* ================= PROVIDER STATUS ================= */}
        <Route path="/provider/status" element={<ProtectedRoute allowedRoles={["traveler", "provider"]}><ProviderStatus /></ProtectedRoute>} />
        <Route path="/provider/pending" element={<ProtectedRoute allowedRoles={["provider"]}><ProviderPending /></ProtectedRoute>} />

        {/* ================= PROVIDER DASHBOARD ================= */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowedRoles={["provider"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="requests" element={<ProviderRequests />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:bookingId" element={<ProviderBookingDetails />} />
          <Route path="travelers" element={<Travelers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="earnings" element={<Earnings />} />
          
          {/* ✅ PROVIDER PAYMENT PAGES */}
          <Route path="payments" element={<ProviderPayments />} />
          <Route path="payments/:paymentId" element={<ProviderPaymentDetails />} />
          
          <Route path="profile" element={<ProviderProfileDashboard />} />
          <Route path="settings" element={<ProviderSettings />} />
          <Route path="notifications" element={<ProviderNotifications />} />
          
          <Route path="add-tour" element={<AddTour />} />
          <Route path="tours" element={<MyTours />} />
          <Route path="tours/edit/:id" element={<EditTour />} />
          
          <Route path="pending" element={<ProviderPending />} />
          <Route path="reviews" element={<ProviderReviews />} />
          <Route path="profile/edit" element={<ProfileEdit />} />
          
          <Route path="listings" element={<MyListings />} />
          <Route path="add-listing" element={<AddListing />} />
          <Route path="listings/edit/:id" element={<EditListing />} />
        </Route>

        {/* ================= ADMIN DASHBOARD ================= */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="providers" element={<Providers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="bookings" element={<AdminBookings />} />
          
          {/* ✅ ADMIN PAYMENT PAGES */}
          <Route path="payments" element={<AdminPayments />} />
          <Route path="payments/:paymentId" element={<AdminPaymentDetails />} />
          
          {/* ✅ ADMIN FINANCIAL PAGES */}
          <Route path="settlements" element={<AdminSettlements />} />
          <Route path="ledger" element={<AdminLedger />} />
          <Route path="exchange-rates" element={<AdminExchangeRates />} />
          
          {/* ✅ ADMIN HERO MEDIA */}
          <Route path="hero-media" element={<HeroMedia />} />
          
          <Route path="footer-settings" element={<FooterSettings />} />
          <Route path="tours" element={<Tours />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="provider-requests" element={<AdminProviderRequests />} />
          <Route path="reviews" element={<AdminReviews />} />
          
          <Route path="about-settings" element={<AboutSettings />} />
          <Route path="contact-settings" element={<ContactSettings />} />
          <Route path="faq-settings" element={<FaqSettings />} />
          <Route path="help-settings" element={<HelpSettings />} />
          <Route path="privacy-settings" element={<PrivacySettings />} />
          <Route path="terms-settings" element={<TermsSettings />} />
          <Route path="careers-settings" element={<CareersSettings />} />
          <Route path="blog-settings" element={<BlogSettings />} />

          <Route path="listings" element={<ManagementListings />} />
          <Route path="provider-requests/:id" element={<ProviderRequestDetails />} />
        </Route>
      </Routes>

      <AIWidget isOpen={isWidgetOpen} onClose={() => setIsWidgetOpen(false)} />
      <FloatingAIButton onOpen={() => setIsWidgetOpen(true)} />
    </CurrencyProvider>
  );
}

export default App;