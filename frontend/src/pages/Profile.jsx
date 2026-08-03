// src/pages/Profile.jsx
// ✅ FIXED - Using API client with correct base URL
// ✅ ADDED - Payments section with payment history and stats
// ✅ FIXED - Added missing Bell import
// ✅ FIXED - Changed reviews endpoint from /my-reviews to /my

import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  Mail,
  Phone,
  MapPin,
  LogOut,
  Edit2,
  Loader2,
  Star,
  Calendar,
  RefreshCw,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  User,
  Sparkles,
  Camera,
  CheckCircle,
  CreditCard,
  Wallet,
  History,
  DollarSign,
  Eye,
  Bell,
} from "lucide-react";

import Card, {
  CardContent
} from "../components/ui/Card";

import Button from "../components/ui/Button";

import {
  useAuth
} from "../contexts/AuthContext";

// ✅ IMPORT API CLIENT
import API from "../services/api";
import paymentService from "../services/paymentService";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Get base URL for uploads (without /api)
const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  // Remove /api if present at the end
  return url.replace(/\/api$/, '');
};

// ✅ Payment Status Badge Component
const PaymentStatusBadge = ({ status }) => {
  const configs = {
    paid: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]', label: 'Paid' },
    pending: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Pending' },
    failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Failed' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Refunded' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Processing' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // ✅ Helper for image URLs
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('data:image')) return path;
    
    const baseUrl = getBaseUrl();
    
    if (path.startsWith('/uploads/')) {
      return `${baseUrl}${path}`;
    }
    
    return `${baseUrl}/uploads/${path}`;
  };

  // ✅ Fetch payment data
  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      
      // Get payment stats
      const statsResponse = await paymentService.getPaymentStats();
      if (statsResponse.success) {
        setPaymentStats(statsResponse.stats);
      }

      // Get recent payments (last 5)
      const paymentsResponse = await paymentService.getMyPayments({ page: 1, limit: 5 });
      if (paymentsResponse.success) {
        setPayments(paymentsResponse.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingPayments(false);
    }
  };

  // ✅ Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      console.log("🔍 Token exists:", !!token);
      console.log("🔍 Token preview:", token?.substring(0, 30) + "...");

      if (!token) {
        console.warn("⚠️ No token found");
        setError("Please login to view your profile");
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      console.log("🔍 Fetching profile from API client");

      let userData = null;
      let bookingsData = [];
      let reviewsData = [];

      // ✅ Fetch user data using API client
      try {
        const u = await API.get('/users/me');
        console.log("✅ User data fetched:", u.data);
        userData = u.data.user;
      } catch (err) {
        console.error("❌ User fetch error:", err.message);
        console.error("❌ Response status:", err.response?.status);
        console.error("❌ Response data:", err.response?.data);
        
        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setTimeout(() => navigate('/login'), 2000);
          setLoading(false);
          return;
        }
        
        setError(err.response?.data?.message || "Failed to load user data");
        setLoading(false);
        return;
      }

      // ✅ Fetch bookings using API client
      try {
        const b = await API.get('/bookings/my-bookings');
        bookingsData = b.data.bookings || [];
        console.log("✅ Bookings fetched:", bookingsData.length);
      } catch (err) {
        console.error("❌ Bookings fetch error:", err.message);
        bookingsData = [];
      }

      // ✅ FIXED: Changed from /my-reviews to /my to match backend route
      try {
        const r = await API.get('/reviews/my');
        reviewsData = r.data.reviews || [];
        console.log("✅ Reviews fetched:", reviewsData.length);
      } catch (err) {
        console.error("❌ Reviews fetch error:", err.message);
        reviewsData = [];
      }

      setUser(userData);
      setBookings(bookingsData);
      setReviews(reviewsData);
      setError(null);
      
      console.log("✅ Profile loaded successfully");

      // ✅ Fetch payments if user is authenticated
      if (token) {
        await fetchPayments();
      }
    } catch (err) {
      console.error("❌ Profile fetch error:", err);
      setError(err.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Handle profile image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setUploading(true);
      setUploadSuccess(false);

      // ✅ Use API client with FormData
      const response = await API.put('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadSuccess(true);
        setUser(prev => ({
          ...prev,
          avatar: response.data.avatar || response.data.user?.avatar
        }));
        // Refresh profile to get updated data
        await fetchProfile();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ✅ Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, b) => a + (b.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  // ✅ Get avatar URL
  const avatarUrl = user?.avatar ? getImageUrl(user.avatar) : null;

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  // =========================
  // ERROR STATE
  // =========================
  if (error) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 mb-3">{error}</p>
        <Button onClick={fetchProfile} className="bg-[#0D9488] text-white hover:bg-[#0D9488]/80">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // =========================
  // MAIN RENDER
  // =========================
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">

      {/* ── HEADER CARD ── */}
      <Card className="border border-gray-100 dark:border-gray-800 shadow-xl rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] h-2" />
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Profile Image */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || 'Profile'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#0D9488] shadow-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center text-4xl font-black shadow-lg shadow-[#0D9488]/30">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#0D9488] text-white shadow-lg hover:bg-[#0D9488]/80 transition disabled:opacity-50"
                title="Upload profile picture"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadSuccess && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white dark:border-gray-800">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                {user?.name}
              </h1>
              <p className="text-gray-500 flex items-center gap-2 text-sm">
                <Mail size={16} className="text-[#0D9488]" />
                {user?.email}
              </p>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                user?.role === 'admin'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : user?.role === 'provider'
                  ? 'bg-[#0D9488]/10 text-[#0D9488] dark:bg-[#0D9488]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20'
              }`}>
                {user?.role || 'Traveler'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link to="/edit-profile">
              <Button className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={logout}
              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── PROVIDER ACTION ── */}
      {authUser?.role === "traveler" && (
        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-5">
              <div>
                <h2 className="text-xl font-black text-[#374151] dark:text-white flex items-center gap-2">
                  <Briefcase className="text-[#0D9488]" />
                  Become Provider
                </h2>
                <p className="text-gray-500 mt-2">
                  Start offering tours and travel services on AI Tour Rwanda.
                </p>
              </div>
              <Link to="/provider/request">
                <Button className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
                  Apply Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {authUser?.role === "provider" && (
        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-5">
              <div>
                <h2 className="text-xl font-black text-[#374151] dark:text-white flex items-center gap-2">
                  <ShieldCheck className="text-[#0D9488]" />
                  Provider Account
                </h2>
                <p className="text-gray-500 mt-2">
                  Manage tours, bookings and travelers.
                </p>
              </div>
              <Link to="/provider/dashboard">
                <Button className="bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition">
                  Open Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STATS ── */}
      <div className="grid md:grid-cols-4 gap-5">
        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-2xl hover:shadow-xl transition">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Total Bookings</p>
              <h2 className="text-3xl font-black text-[#374151] dark:text-white">
                {bookings.length}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#0D9488]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-2xl hover:shadow-xl transition">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Total Reviews</p>
              <h2 className="text-3xl font-black text-[#374151] dark:text-white">
                {reviews.length}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-2xl hover:shadow-xl transition">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Average Rating</p>
              <h2 className="text-3xl font-black text-[#374151] dark:text-white">
                {avgRating}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-[#F59E0B] fill-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>

        {/* ✅ Payment Stats Card */}
        <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-2xl hover:shadow-xl transition">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Total Payments</p>
              <h2 className="text-3xl font-black text-[#374151] dark:text-white">
                {paymentStats?.total || 0}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#0D9488]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PAYMENT STATS BREAKDOWN ── */}
      {paymentStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-xl font-bold text-[#0D9488]">{paymentStats.paid || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-xl font-bold text-[#F59E0B]">{paymentStats.pending || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            <p className="text-xl font-bold text-red-600">{paymentStats.failed || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">Refunded</p>
            <p className="text-xl font-bold text-gray-500">{paymentStats.refunded || 0}</p>
          </div>
        </div>
      )}

      {/* ── RECENT PAYMENTS ── */}
      <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-3xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#374151] dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0D9488]" />
              Recent Payments
            </h2>
            <Link to="/traveler/payments">
              <Button variant="outline" size="sm" className="text-[#0D9488] border-[#0D9488] hover:bg-[#0D9488]/10">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No payment history yet</p>
              <Link to="/explore" className="text-[#0D9488] text-sm hover:underline inline-block mt-2">
                Start exploring tours
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-[#374151] dark:text-white truncate max-w-[150px]">
                          {payment.listing?.title || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                          {payment.transactionId || payment.stripePaymentId || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-[#0D9488]">${payment.amount?.toFixed(2) || '0.00'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-500">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/traveler/payments/${payment._id}`}>
                          <Button variant="ghost" size="sm" className="text-[#0D9488] hover:bg-[#0D9488]/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PROFILE INFO ── */}
      <Card className="border border-gray-100 dark:border-gray-800 shadow-lg rounded-3xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-black text-[#374151] dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#0D9488]" />
            Profile Information
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <Phone size={18} className="text-[#0D9488]" />
              {user?.phone || "No phone number"}
            </div>

            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <MapPin size={18} className="text-[#F59E0B]" />
              {user?.country || "No country set"}
            </div>

            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <Calendar size={18} className="text-[#0D9488]" />
              Member since {user?.createdAt 
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'N/A'}
            </div>

            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <ShieldCheck size={18} className="text-[#F59E0B]" />
              {user?.isEmailVerified ? 'Email Verified ✅' : 'Email Not Verified ⚠️'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── QUICK ACTION LINKS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/my-bookings" className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition text-center group">
          <Calendar className="w-6 h-6 text-[#0D9488] mx-auto mb-2 group-hover:scale-110 transition" />
          <p className="text-sm font-medium text-[#374151] dark:text-white">My Bookings</p>
        </Link>
        <Link to="/my-reviews" className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition text-center group">
          <Star className="w-6 h-6 text-[#F59E0B] mx-auto mb-2 group-hover:scale-110 transition" />
          <p className="text-sm font-medium text-[#374151] dark:text-white">My Reviews</p>
        </Link>
        <Link to="/traveler/payments" className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition text-center group">
          <CreditCard className="w-6 h-6 text-[#0D9488] mx-auto mb-2 group-hover:scale-110 transition" />
          <p className="text-sm font-medium text-[#374151] dark:text-white">Payments</p>
        </Link>
        <Link to="/notifications" className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition text-center group">
          <Bell className="w-6 h-6 text-[#F59E0B] mx-auto mb-2 group-hover:scale-110 transition" />
          <p className="text-sm font-medium text-[#374151] dark:text-white">Notifications</p>
        </Link>
      </div>

      {/* ── PROFILE TIP ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D9488]/5 to-[#F59E0B]/5 border border-[#0D9488]/10">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#374151] dark:text-white">
              💡 Profile Tips
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add a profile photo to help providers recognize you. Keep your contact information up to date for booking confirmations.
              Check your payment history to track all transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;