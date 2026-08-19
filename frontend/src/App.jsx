// src/App.jsx
// ✅ COMPLETE FIXED - Added lazy loading for all routes
// ✅ Performance: Code splitting with React.lazy
// ✅ Added Suspense fallback
// ✅ Added CurrencyProvider wrapper
// ✅ Removed duplicate AdminPayments import
// ✅ ADDED: Settlements, Ledger, Exchange Rates routes
// ✅ ADDED: Hero Media route
// ✅ ADDED: Chat routes for real-time messaging
// ✅ ADDED: Admin Chat route
// ✅ ADDED: Provider Chat route
// ✅ FIXED: ResetPassword and VerifyEmail use query parameters (?token=)
// ❌ REMOVED: Featured Experiences (completely removed)

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

// ✅ IMPORT CurrencyProvider
import { CurrencyProvider } from './contexts/CurrencyContext';

// Layouts - Loaded eagerly (critical)
import MainLayout from './components/layout/Layout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Core Components - Loaded eagerly (critical)
import FloatingAIButton from './components/ui/FloatingAIButton';
import AIWidget from './components/ai/AIWidget';
import ProtectedRoute from './routes/ProtectedRoute';

// ✅ Socket.IO
import { initSocket, disconnectSocket } from './lib/socket';
import { useAuth } from './contexts/AuthContext';

// ============================================================
// ✅ LAZY LOAD ALL PAGE COMPONENTS
// ============================================================

// User Pages - Lazy loaded
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Explore = lazy(() => import('./pages/Explore'));
const AIPlanner = lazy(() => import('./pages/AIPlanner'));
const Booking = lazy(() => import('./pages/Booking'));
const Trips = lazy(() => import('./pages/Trips'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Profile = lazy(() => import('./pages/Profile'));
const UserNotifications = lazy(() => import('./pages/Notifications'));
const DestinationDetails = lazy(() => import('./pages/DestinationDetails'));
const TripResults = lazy(() => import('./pages/TripResults'));
const RequestTrip = lazy(() => import('./pages/RequestTrip'));
const Payment = lazy(() => import('./pages/Payment'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const TourDetails = lazy(() => import('./pages/TourDetails'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const AIChat = lazy(() => import('./pages/AIChat'));
const CustomRequest = lazy(() => import('./pages/CustomRequest'));
const MyReviews = lazy(() => import('./pages/MyReviews'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const TripDetails = lazy(() => import('./pages/TripDetails'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const ReviewDetails = lazy(() => import('./pages/ReviewDetails'));
const Review = lazy(() => import('./pages/Review'));
const ListingDetails = lazy(() => import('./pages/ListingDetails'));

// ✅ CHAT PAGES - Real-time messaging
const Chat = lazy(() => import('./pages/Chat'));

// ✅ ADMIN CHAT
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));

// ✅ PROVIDER CHAT
const ProviderChat = lazy(() => import('./pages/provider/ProviderChat'));

// Auth Pages - Lazy loaded
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

// Footer Pages - Lazy loaded
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Careers = lazy(() => import('./pages/Careers'));
const Blog = lazy(() => import('./pages/Blog'));
const FAQs = lazy(() => import('./pages/FAQs'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const ProviderPublicProfile = lazy(() => import('./pages/ProviderProfile'));

// Provider Notifications
const ProviderNotifications = lazy(() => import('./pages/provider/ProviderNotifications'));

// Provider Booking Details
const ProviderBookingDetails = lazy(() => import('./pages/provider/BookingDetails'));

// ✅ PAYMENT PAGES - Lazy loaded
const TravelerPayments = lazy(() => import('./pages/traveler/Payments'));
const TravelerPaymentDetails = lazy(() => import('./pages/traveler/PaymentDetails'));
const ProviderPayments = lazy(() => import('./pages/provider/Payments'));
const ProviderPaymentDetails = lazy(() => import('./pages/provider/PaymentDetails'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminPaymentDetails = lazy(() => import('./pages/admin/PaymentDetails'));

// ✅ ADMIN FINANCIAL PAGES - Lazy loaded
const AdminSettlements = lazy(() => import('./pages/admin/Settlements'));
const AdminLedger = lazy(() => import('./pages/admin/Ledger'));
const AdminExchangeRates = lazy(() => import('./pages/admin/ExchangeRates'));

// ✅ ADMIN HERO MEDIA - Lazy loaded
const HeroMedia = lazy(() => import('./pages/admin/HeroMedia'));

// Admin Pages - Lazy loaded
const Users = lazy(() => import('./pages/admin/Users'));
const Tours = lazy(() => import('./pages/admin/Tours'));
const Providers = lazy(() => import('./pages/admin/Providers'));
const AdminRequests = lazy(() => import('./pages/admin/Requests'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProviderRequests = lazy(() => import('./pages/admin/ProviderRequests'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const ProviderRequestDetails = lazy(() => import('./pages/admin/ProviderRequestDetails'));
const ManagementListings = lazy(() => import('./pages/admin/ManagementListings'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const FooterSettings = lazy(() => import('./pages/admin/FooterSettings'));
const AboutSettings = lazy(() => import('./pages/admin/AboutSettings'));
const ContactSettings = lazy(() => import('./pages/admin/ContactSettings'));
const FaqSettings = lazy(() => import('./pages/admin/FaqSettings'));
const HelpSettings = lazy(() => import('./pages/admin/HelpSettings'));
const PrivacySettings = lazy(() => import('./pages/admin/PrivacySettings'));
const TermsSettings = lazy(() => import('./pages/admin/TermsSettings'));
const CareersSettings = lazy(() => import('./pages/admin/CareersSettings'));
const BlogSettings = lazy(() => import('./pages/admin/BlogSettings'));

// Provider Pages - Lazy loaded
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard'));
const ProviderRequests = lazy(() => import('./pages/provider/Requests'));
const Bookings = lazy(() => import('./pages/provider/Bookings'));
const Travelers = lazy(() => import('./pages/provider/Travelers'));
const Analytics = lazy(() => import('./pages/provider/Analytics'));
const Earnings = lazy(() => import('./pages/provider/Earnings'));
const ProviderProfileDashboard = lazy(() => import('./pages/provider/Profile'));
const ProviderSettings = lazy(() => import('./pages/provider/Settings'));
const AddTour = lazy(() => import('./pages/provider/AddTour'));
const MyTours = lazy(() => import('./pages/provider/MyTours'));
const EditTour = lazy(() => import('./pages/provider/EditTour'));
const ProviderStatus = lazy(() => import('./pages/provider/ProviderStatus'));
const ProviderPending = lazy(() => import('./pages/ProviderPending'));
const ProviderRequest = lazy(() => import('./pages/ProviderRequest'));
const ProviderReviews = lazy(() => import('./pages/provider/Reviews'));
const ProfileEdit = lazy(() => import('./pages/provider/ProfileEdit'));

// Listing Pages - Lazy loaded
const MyListings = lazy(() => import('./pages/provider/MyListings'));
const AddListing = lazy(() => import('./pages/provider/AddListing'));
const EditListing = lazy(() => import('./pages/provider/EditListing'));

// ============================================================
// ✅ LOADING FALLBACK COMPONENT
// ============================================================
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ============================================================
// ✅ APP COMPONENT
// ============================================================
function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const { token, user } = useAuth();

  // ✅ Initialize socket when user authenticates
  useEffect(() => {
    if (token && user) {
      initSocket(token);
    } else {
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [token, user]);

  return (
    <CurrencyProvider>
      <Suspense fallback={<PageLoader />}>
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
            
            {/* Auth Routes - ✅ FIXED: No :token parameter */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

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

            {/* ✅ CHAT ROUTES - Real-time messaging */}
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
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
            
            {/* ✅ PROVIDER CHAT ROUTE */}
            <Route path="chat" element={<ProviderChat />} />
            <Route path="chat/:conversationId" element={<ProviderChat />} />
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
            
            {/* ✅ ADMIN CHAT ROUTE */}
            <Route path="chat" element={<AdminChat />} />
            <Route path="chat/:conversationId" element={<AdminChat />} />
          </Route>
        </Routes>

        <AIWidget isOpen={isWidgetOpen} onClose={() => setIsWidgetOpen(false)} />
        <FloatingAIButton onOpen={() => setIsWidgetOpen(true)} />
      </Suspense>
    </CurrencyProvider>
  );
}

export default App;