// frontend/src/pages/admin/HeroMedia.jsx
// ✅ SIMPLIFIED - Hero Video Management
// ✅ Removed required validation for Title, Description, Listing
// ✅ Uses dedicated hero service

import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  FileVideo,
  Play,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Globe,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";
import LoadingSkeleton from "../../components/ui/LoadingSkeleton";
import {
  getAllHeroVideos,
  createHeroVideo,
  updateHeroVideo,
  uploadHeroVideoFile,
  toggleHeroVideo,
  deleteHeroVideo,
  updateHeroVideoPriority,
} from "../../services/heroService";
import { getListings } from "../../services/listingService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── STATUS BADGE ──────────────────────────────────────────────
const StatusBadge = ({ enabled }) => {
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0D9488]/10 text-[#0D9488]">
        <Eye className="w-3 h-3" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      <EyeOff className="w-3 h-3" /> Hidden
    </span>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────
const HeroMedia = () => {
  const [items, setItems] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // ── Modal States ──────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingListings, setLoadingListings] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ── Form State ────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    description: "",
    listingId: "",
    priority: 0,
    isActive: true,
  });

  // ── Video Upload State ──────────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // ── Fetch Listings ──────────────────────────────────────────────
  const fetchListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const response = await getListings({ limit: 100 });
      const listingsData = response.listings || response.data || [];
      setListings(listingsData);
    } catch (err) {
      console.error("❌ Error fetching listings:", err);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  // ── Fetch Hero Videos ──────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllHeroVideos({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });

      if (response.success) {
        setItems(response.data || []);
        setPagination({
          ...pagination,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
        });
      }
    } catch (err) {
      console.error("❌ Error fetching hero videos:", err);
      setError("Failed to load hero videos");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  // ── Initial Load ────────────────────────────────────────────────
  useEffect(() => {
    fetchItems();
    fetchListings();
  }, []);

  // ── Handle Create ──────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      toast.error("Please select a video");
      return;
    }

    try {
      setFormLoading(true);

      const formData = new FormData();
      formData.append("heroVideo", videoFile);
      if (form.title) formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      if (form.listingId) formData.append("listingId", form.listingId);
      formData.append("priority", form.priority);
      formData.append("isActive", form.isActive);

      await createHeroVideo(formData);

      toast.success("Hero video created! 🎉");
      setShowCreateModal(false);
      resetForm();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Handle Update ──────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await updateHeroVideo(selectedItem._id, form);
      toast.success("Updated successfully! ✅");
      setShowEditModal(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Handle Video Upload (Replace) ──────────────────────────────
  const handleVideoUpload = async () => {
    if (!videoFile || !selectedItem) return;

    try {
      setUploadingVideo(true);
      await uploadHeroVideoFile(selectedItem._id, videoFile);
      toast.success("Video uploaded! 🎬");
      setVideoFile(null);
      setVideoPreview(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload video");
    } finally {
      setUploadingVideo(false);
    }
  };

  // ── Handle Toggle ──────────────────────────────────────────────
  const handleToggle = async (id, isActive) => {
    try {
      await toggleHeroVideo(id, isActive);
      toast.success(`Video ${isActive ? "activated" : "hidden"}`);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle");
    }
  };

  // ── Handle Delete ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this hero video?")) return;
    try {
      await deleteHeroVideo(id);
      toast.success("Deleted");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  // ── Handle Priority Move ──────────────────────────────────────
  const movePriority = async (id, direction) => {
    const currentIndex = items.findIndex(item => item._id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[currentIndex];
    const targetItem = items[targetIndex];

    try {
      await updateHeroVideoPriority(currentItem._id, targetItem.priority || 0);
      await updateHeroVideoPriority(targetItem._id, currentItem.priority || 0);
      fetchItems();
      toast.success("Priority updated");
    } catch (err) {
      toast.error("Failed to update priority");
    }
  };

  // ── Reset Form ──────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      listingId: "",
      priority: 0,
      isActive: true,
    });
    setVideoFile(null);
    setVideoPreview(null);
  };

  // ── Open Edit Modal ────────────────────────────────────────────
  const openEditModal = (item) => {
    setSelectedItem(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      listingId: item.listingId?._id || item.listingId || "",
      priority: item.priority || 0,
      isActive: item.isActive !== false,
    });
    setShowEditModal(true);
  };

  // ── Go to Page ──────────────────────────────────────────────────
  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // ─── LOADING ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <LoadingSkeleton count={5} type="list" />
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#374151] dark:text-white">
                Hero Media
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage homepage hero videos
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Hero Video
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#0D9488]/5 border border-[#0D9488]/20 rounded-2xl p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-[#0D9488] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[#374151] dark:text-white">
            Hero videos appear on the homepage
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Active videos rotate automatically. Videos with higher priority appear first.
            Title, description, and related listing are optional.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search hero videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
          />
        </div>
        <button
          onClick={fetchItems}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={fetchItems} className="ml-auto text-sm underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800">
          <Video className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#374151] dark:text-white">No Hero Videos</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Add your first hero video to showcase experiences on the homepage
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-4 px-6 py-2 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
          >
            + Add Hero Video
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {items.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {item.videoUrl ? (
                            <video
                              src={`${API_URL}${item.videoUrl}`}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              poster={item.thumbnail ? `${API_URL}${item.thumbnail}` : undefined}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <FileVideo className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#374151] dark:text-white">
                          {item.title || "Untitled"}
                        </p>
                        {item.listingId && (
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">
                            {typeof item.listingId === 'object' ? item.listingId.title : '—'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{item.priority || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge enabled={item.isActive} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => movePriority(item._id, 'up')}
                          disabled={index === 0}
                          className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => movePriority(item._id, 'down')}
                          disabled={index === items.length - 1}
                          className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggle(item._id, !item.isActive)}
                          className="p-2 rounded-xl hover:bg-[#F59E0B]/10 transition text-gray-400 hover:text-[#F59E0B]"
                          title={item.isActive ? "Hide" : "Show"}
                        >
                          {item.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488]"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-2 rounded-xl hover:bg-red-100 transition text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-gray-500">
            Showing {items.length} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          CREATE MODAL - Simplified (No required validation)
          ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                  <Video className="w-6 h-6 text-[#0D9488]" />
                  Add Hero Video
                </h2>
                <p className="text-sm text-gray-500 mt-1">Upload a video for the homepage hero</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Video Upload - REQUIRED */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Hero Video <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 ml-2">(MP4/WebM, max 20MB, max 20 seconds)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-[#0D9488] transition">
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    id="create-video-upload"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setVideoFile(file);
                        setVideoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="create-video-upload" className="cursor-pointer block">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload video</p>
                    <p className="text-xs text-gray-400">MP4, WebM • Max 20MB • Max 20 seconds</p>
                  </label>
                  {videoPreview && (
                    <div className="mt-3">
                      <video
                        src={videoPreview}
                        className="max-h-32 rounded-lg mx-auto"
                        controls
                        muted
                        playsInline
                      />
                      <p className="text-xs text-[#0D9488] mt-1">{videoFile?.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Title <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Gorilla Trek Experience"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                />
              </div>

              {/* Description - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Description <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the experience..."
                  rows="2"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none"
                />
              </div>

              {/* Related Listing - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Related Listing <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <select
                  value={form.listingId}
                  onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                >
                  <option value="">None</option>
                  {loadingListings ? (
                    <option disabled>Loading listings...</option>
                  ) : (
                    listings.map((listing) => (
                      <option key={listing._id} value={listing._id}>
                        {listing.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Priority <span className="text-xs text-gray-400">(Higher = appears first)</span>
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <label className="text-sm font-medium text-[#374151] dark:text-white">
                  Active on Homepage
                </label>
                <span className="text-xs text-gray-400 ml-auto">Video will appear in hero rotation</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Save Hero Video
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-8 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT MODAL
          ============================================================ */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-[#0D9488]" />
                  Edit Hero Video
                </h2>
                <p className="text-sm text-gray-500 mt-1">Update hero video details</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setSelectedItem(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              {/* Title - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Title <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                />
              </div>

              {/* Description - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Description <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none"
                />
              </div>

              {/* Related Listing - OPTIONAL */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Related Listing <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <select
                  value={form.listingId}
                  onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                >
                  <option value="">None</option>
                  {listings.map((listing) => (
                    <option key={listing._id} value={listing._id}>
                      {listing.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Video */}
              {selectedItem.videoUrl && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-2">
                    Current Video
                  </label>
                  <div className="flex items-center gap-3">
                    <video
                      src={`${API_URL}${selectedItem.videoUrl}`}
                      className="w-32 h-20 rounded-lg object-cover"
                      muted
                      playsInline
                      poster={selectedItem.thumbnail ? `${API_URL}${selectedItem.thumbnail}` : undefined}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#374151] dark:text-white">
                        {selectedItem.duration || 0}s video
                      </p>
                      <p className="text-xs text-gray-400">
                        {(selectedItem.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload New Video */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Replace Video <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-[#0D9488] transition">
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    id="edit-video-upload"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setVideoFile(file);
                        setVideoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="edit-video-upload" className="cursor-pointer block">
                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-500">Click to upload new video</p>
                    <p className="text-xs text-gray-400">MP4, WebM • Max 20MB • Max 20 seconds</p>
                  </label>
                </div>
              </div>

              {/* Video Preview */}
              {videoPreview && (
                <div className="p-3 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20">
                  <div className="flex items-center gap-3">
                    <video
                      src={videoPreview}
                      className="w-32 h-20 rounded-lg object-cover"
                      controls
                      muted
                      playsInline
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0D9488]">New video ready</p>
                      <p className="text-xs text-gray-400">{videoFile?.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleVideoUpload}
                      disabled={uploadingVideo}
                      className="px-4 py-2 rounded-lg bg-[#0D9488] text-white font-medium text-sm hover:bg-[#0D9488]/80 transition disabled:opacity-50"
                    >
                      {uploadingVideo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Upload"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-white mb-1.5">
                  Priority <span className="text-xs text-gray-400">(Higher = appears first)</span>
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-32 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <label className="text-sm font-medium text-[#374151] dark:text-white">
                  Active on Homepage
                </label>
                <span className="text-xs text-gray-400 ml-auto">Video will appear in hero rotation</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Update Hero Video
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedItem(null); }}
                  className="px-8 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroMedia;