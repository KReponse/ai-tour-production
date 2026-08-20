// frontend/src/pages/admin/HeroMedia.jsx
// ✅ COMPLETE FIXED - Backend upload with progress
// ✅ No direct Cloudinary upload
// ✅ Shows upload progress bar
// ✅ Supports large video files (up to 500MB)
// ✅ Removed required validation for Title, Description, Listing
// ✅ RESPONSIVE: Mobile-optimized with proper touch targets

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
  ArrowUp,
  ArrowDown,
  Globe,
  Home,
  Cloud,
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

// ─── STATUS BADGE ──────────────────────────────────────────────
const StatusBadge = ({ enabled }) => {
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold bg-[#0D9488]/10 text-[#0D9488]">
        <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
        <span className="hidden xs:inline">Active</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold bg-gray-100 text-gray-500">
      <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
      <span className="hidden xs:inline">Hidden</span>
    </span>
  );
};

// ─── PROGRESS BAR ──────────────────────────────────────────────
const UploadProgress = ({ progress }) => {
  if (progress === null || progress === undefined) return null;
  
  const isComplete = progress >= 100;
  const isError = progress < 0;
  
  return (
    <div className="mt-2 sm:mt-3">
      <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">
        <span>{isError ? 'Upload failed' : isComplete ? 'Processing...' : 'Uploading...'}</span>
        <span>{isError ? '❌' : isComplete ? '✅' : `${Math.round(progress)}%`}</span>
      </div>
      <div className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isError ? 'bg-red-500' : isComplete ? 'bg-[#0D9488]' : 'bg-[#0D9488]'
          }`}
          style={{ width: isError ? '100%' : `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
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
  const [uploadProgress, setUploadProgress] = useState(null);

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

  // ── Handle Create ─────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      toast.error("Please select a video");
      return;
    }

    // File size validation
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    const WARNING_SIZE = 200 * 1024 * 1024; // 200MB

    if (videoFile.size > MAX_SIZE) {
      toast.error("Video file too large. Maximum size is 500MB.");
      return;
    }

    if (videoFile.size > WARNING_SIZE) {
      toast.warning("Large file detected. Upload may take several minutes. Please be patient.");
    }

    try {
      setFormLoading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("heroVideo", videoFile);
      if (form.title) formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      if (form.listingId) formData.append("listingId", form.listingId);
      formData.append("priority", form.priority);
      formData.append("isActive", form.isActive);

      toast.loading("Uploading video...", { id: 'hero-upload' });

      const response = await createHeroVideo(formData, (progress) => {
        setUploadProgress(progress);
        toast.loading(`Uploading... ${Math.round(progress)}%`, { id: 'hero-upload' });
      });

      if (response.success) {
        toast.success("Hero video created! 🎉", { id: 'hero-upload' });
        setShowCreateModal(false);
        resetForm();
        // ✅ Update list without page refresh
        await fetchItems();
      } else {
        toast.error(response.message || "Failed to create", { id: 'hero-upload' });
      }
    } catch (err) {
      console.error("❌ Create hero video error:", err);
      toast.error(err.message || "Failed to create hero video", { id: 'hero-upload' });
    } finally {
      setFormLoading(false);
      setUploadProgress(null);
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
      await fetchItems();
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
      await fetchItems();
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
      await fetchItems();
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
      await fetchItems();
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
      await fetchItems();
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
    setUploadProgress(null);
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
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <LoadingSkeleton count={3} type="list" />
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center shadow-lg flex-shrink-0">
            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#374151] dark:text-white">
              Hero Media
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
              Manage homepage hero videos
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base min-h-[44px] touch-manipulation"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Add Hero Video</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#0D9488]/5 border border-[#0D9488]/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488] flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[#374151] dark:text-white">
            Hero videos appear on the homepage
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Active videos rotate automatically. Videos with higher priority appear first.
            Title, description, and related listing are optional.
          </p>
          <p className="text-[10px] sm:text-xs text-[#0D9488] mt-1">
            ⚡ Videos are uploaded through the secure backend - no timeout issues!
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col xs:flex-row gap-2 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search hero videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 h-10 sm:h-12 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base"
          />
        </div>
        <button
          onClick={fetchItems}
          className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="break-words">{error}</span>
          <button onClick={fetchItems} className="ml-auto text-xs sm:text-sm underline whitespace-nowrap">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-3xl p-8 sm:p-16 text-center border border-gray-200 dark:border-gray-800">
          <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white">No Hero Videos</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
            Add your first hero video to showcase experiences on the homepage
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition text-sm sm:text-base min-h-[44px] touch-manipulation"
          >
            + Add Hero Video
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-full inline-block align-middle px-3 sm:px-0">
              <table className="w-full min-w-[600px] sm:min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden xs:table-cell">Title</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Priority</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {items.map((item, index) => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-xs sm:text-sm text-gray-400">{index + 1}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-12 h-8 sm:w-16 sm:h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {item.videoUrl ? (
                              <video
                                src={item.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                poster={item.thumbnail}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <FileVideo className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xs:table-cell">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-[#374151] dark:text-white truncate max-w-[100px] sm:max-w-[150px]">
                            {item.title || "Untitled"}
                          </p>
                          {item.listingId && (
                            <p className="text-[8px] sm:text-xs text-gray-400 truncate max-w-[100px] sm:max-w-[150px]">
                              {typeof item.listingId === 'object' ? item.listingId.title : '—'}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                        <span className="text-xs sm:text-sm text-gray-500">{item.priority || 0}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <StatusBadge enabled={item.isActive} />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                          <button
                            onClick={() => movePriority(item._id, 'up')}
                            disabled={index === 0}
                            className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg sm:rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 disabled:opacity-30 flex items-center justify-center touch-manipulation"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => movePriority(item._id, 'down')}
                            disabled={index === items.length - 1}
                            className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg sm:rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 disabled:opacity-30 flex items-center justify-center touch-manipulation"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>

                          <button
                            onClick={() => handleToggle(item._id, !item.isActive)}
                            className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg sm:rounded-xl hover:bg-[#F59E0B]/10 transition text-gray-400 hover:text-[#F59E0B] flex items-center justify-center touch-manipulation"
                            title={item.isActive ? "Hide" : "Show"}
                          >
                            {item.isActive ? (
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            ) : (
                              <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg sm:rounded-xl hover:bg-[#0D9488]/10 transition text-gray-400 hover:text-[#0D9488] flex items-center justify-center touch-manipulation"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(item._id)}
                            className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg sm:rounded-xl hover:bg-red-100 transition text-gray-400 hover:text-red-500 flex items-center justify-center touch-manipulation"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col xs:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-gray-500">
            Showing {items.length} of {pagination.total}
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center touch-manipulation"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-xs sm:text-sm font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center touch-manipulation"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          CREATE MODAL
          ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488]" />
                  Add Hero Video
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Upload through secure backend</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition touch-manipulation">
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 sm:space-y-5">
              {/* Video Upload - REQUIRED */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Hero Video <span className="text-red-500">*</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 ml-1 sm:ml-2">(MP4/WebM, max 500MB)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center hover:border-[#0D9488] transition">
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
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-400 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-gray-500">Click to select video</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">Secure backend upload • 10 min timeout</p>
                  </label>
                  {videoPreview && (
                    <div className="mt-2 sm:mt-3">
                      <video
                        src={videoPreview}
                        className="max-h-24 sm:max-h-32 rounded-lg mx-auto"
                        controls
                        muted
                        playsInline
                      />
                      <p className="text-[10px] sm:text-xs text-[#0D9488] mt-1">{videoFile?.name}</p>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                <UploadProgress progress={uploadProgress} />
              </div>

              {/* Title - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Title <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Gorilla Trek Experience"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
                />
              </div>

              {/* Description - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Description <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the experience..."
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none text-sm sm:text-base"
                />
              </div>

              {/* Related Listing - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Related Listing <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <select
                  value={form.listingId}
                  onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
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
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Priority <span className="text-[10px] sm:text-xs text-gray-400">(Higher = appears first)</span>
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-24 sm:w-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <label className="text-xs sm:text-sm font-medium text-[#374151] dark:text-white">
                  Active on Homepage
                </label>
                <span className="text-[10px] sm:text-xs text-gray-400 ml-auto">Video will appear in hero rotation</span>
              </div>

              {/* Buttons - Responsive */}
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={formLoading || uploadProgress !== null}
                  className="flex-1 min-h-[44px] sm:min-h-[48px] px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      {uploadProgress !== null ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      Upload Video
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-[44px] sm:min-h-[48px] px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm sm:text-base touch-manipulation"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#374151] dark:text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D9488]" />
                  Edit Hero Video
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Update hero video details</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setSelectedItem(null); }} className="min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition touch-manipulation">
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 sm:space-y-5">
              {/* Title - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Title <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
                />
              </div>

              {/* Description - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Description <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none resize-none text-sm sm:text-base"
                />
              </div>

              {/* Related Listing - OPTIONAL */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Related Listing <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <select
                  value={form.listingId}
                  onChange={(e) => setForm({ ...form, listingId: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
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
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1.5 sm:mb-2">
                    Current Video
                  </label>
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                    <video
                      src={selectedItem.videoUrl}
                      className="w-full xs:w-32 h-16 sm:h-20 rounded-lg object-cover"
                      muted
                      playsInline
                      poster={selectedItem.thumbnail}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#374151] dark:text-white">
                        {selectedItem.duration || 0}s video
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {(selectedItem.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload New Video */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Replace Video <span className="text-[10px] sm:text-xs text-gray-400">(Optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-4 text-center hover:border-[#0D9488] transition">
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
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs sm:text-sm text-gray-500">Click to upload new video</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">MP4, WebM • Max 500MB</p>
                  </label>
                </div>
              </div>

              {/* Video Preview */}
              {videoPreview && (
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/20">
                  <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                    <video
                      src={videoPreview}
                      className="w-full xs:w-32 h-16 sm:h-20 rounded-lg object-cover"
                      controls
                      muted
                      playsInline
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[#0D9488]">New video ready</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 truncate">{videoFile?.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleVideoUpload}
                      disabled={uploadingVideo}
                      className="min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#0D9488] text-white font-medium text-xs sm:text-sm hover:bg-[#0D9488]/80 transition disabled:opacity-50 touch-manipulation"
                    >
                      {uploadingVideo ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        "Upload"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#374151] dark:text-white mb-1 sm:mb-1.5">
                  Priority <span className="text-[10px] sm:text-xs text-gray-400">(Higher = appears first)</span>
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-24 sm:w-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition outline-none text-sm sm:text-base min-h-[44px]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                />
                <label className="text-xs sm:text-sm font-medium text-[#374151] dark:text-white">
                  Active on Homepage
                </label>
                <span className="text-[10px] sm:text-xs text-gray-400 ml-auto">Video will appear in hero rotation</span>
              </div>

              {/* Buttons - Responsive */}
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 min-h-[44px] sm:min-h-[48px] px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#F59E0B] text-white font-bold shadow-lg shadow-[#0D9488]/30 hover:scale-[1.02] transition disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base touch-manipulation"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Update Hero Video
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedItem(null); }}
                  className="min-h-[44px] sm:min-h-[48px] px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm sm:text-base touch-manipulation"
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