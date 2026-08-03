// src/pages/EditProfile.jsx

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Camera,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  ArrowLeft,
  Globe,
  Calendar,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

// ===============================
// AI TOUR COLORS
// ===============================
// Teal  : #0D9488
// Gold  : #F59E0B
// Slate : #374151
// White : #FFFFFF
// ===============================

// ✅ Use consistent API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    avatar: "",
    bio: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem("token");

  // ======================
  // FETCH USER DATA
  // ======================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setFetching(true);
        const response = await axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const userData = response.data.user;
        setFormData({
          name: userData?.name || "",
          email: userData?.email || "",
          phone: userData?.phone || "",
          country: userData?.country || "",
          avatar: userData?.avatar || "",
          bio: userData?.bio || "",
          location: userData?.location || "",
        });
      } catch (error) {
        console.error("❌ Error fetching user:", error);
        toast.error("Failed to load profile data");
      } finally {
        setFetching(false);
      }
    };

    if (token) {
      fetchUser();
    }
  }, [token]);

  // ======================
  // IMAGE UPLOAD (Base64)
  // ======================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: reader.result,
      }));
      setUploading(false);
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read image file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setFormData((prev) => ({
      ...prev,
      avatar: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ======================
  // INPUT CHANGE
  // ======================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
    setSuccess(false);
  };

  // ======================
  // GET IMAGE URL
  // ======================
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
    if (path.startsWith('data:image')) return path;
    return `${API_BASE}/uploads/${path}`;
  };

  // ======================
  // SUBMIT
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);

      // ✅ Prepare data for backend
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        country: formData.country || "",
        bio: formData.bio || "",
        location: formData.location || "",
      };

      // ✅ If avatar is base64, send it separately or handle upload
      // For now, we'll use the existing avatar URL or null
      if (formData.avatar && formData.avatar.startsWith('data:image')) {
        // This would require a separate upload endpoint
        // For simplicity, we're using the existing avatar
        updateData.avatar = formData.avatar;
      }

      const response = await axios.put(
        `${API_URL}/users/me`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const updatedUser = response.data.user;

      // Update UI using updateUser from AuthContext
      updateUser(updatedUser);

      setSuccess(true);
      toast.success("Profile updated successfully! 🎉");
      
      setTimeout(() => {
        setSuccess(false);
        navigate("/profile");
      }, 2000);

    } catch (err) {
      console.error("❌ Update error:", err);
      setError(err.response?.data?.message || "Update failed. Please try again.");
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // LOADING STATE
  // ======================
  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-800">

        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#374151] dark:text-white">
                Edit Profile
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Update your account information
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* SUCCESS NOTIFICATION */}
        {success && (
          <div className="mb-4 p-4 rounded-2xl bg-[#0D9488]/10 dark:bg-[#0D9488]/20 border border-[#0D9488]/30 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-[#0D9488]" />
            <span className="text-[#0D9488] font-medium">Profile updated successfully! ✅</span>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        {/* AVATAR */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={getImageUrl(formData.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=0D9488&color=fff&size=128`}
                  alt="avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#0D9488] shadow-lg transition group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=0D9488&color=fff&size=128`;
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#0D9488] to-[#F59E0B] text-white flex items-center justify-center text-5xl font-black shadow-lg shadow-[#0D9488]/30">
                  {formData.name?.charAt(0) || 'U'}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            
            <label className="absolute bottom-0 right-0 bg-gradient-to-r from-[#0D9488] to-[#F59E0B] p-3 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-all duration-300">
              <Camera className="w-5 h-5 text-white" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {formData.avatar && (
              <button
                onClick={removeAvatar}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NAME */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white"
                required
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white"
                required
              />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+250 7XX XXX XXX"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white"
              />
            </div>
          </div>

          {/* COUNTRY */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Country
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Rwanda"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white"
              />
            </div>
          </div>

          {/* LOCATION (Optional) */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
                placeholder="e.g., Kigali, Rwanda"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none dark:text-white"
              />
            </div>
          </div>

          {/* BIO */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#374151] dark:text-white">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio || ""}
              onChange={handleChange}
              placeholder="Tell us a little about yourself..."
              rows="3"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none dark:text-white"
            />
          </div>

          {/* SAVE */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </form>

        {/* Profile Tips */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#0D9488]/10 to-[#F59E0B]/10 border border-[#0D9488]/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#374151] dark:text-white">
                💡 Profile Tips
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add a profile photo to help providers recognize you. Keep your contact information up to date for booking confirmations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;