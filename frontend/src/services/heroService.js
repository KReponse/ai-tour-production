// frontend/src/services/heroService.js
// ✅ NEW - Hero Video API Service

import API from "./api";

// ============================================================
// ✅ GET ACTIVE HERO VIDEOS (Public)
// ============================================================
export const getActiveHeroVideos = async (limit = 10) => {
  try {
    const response = await API.get("/hero/active", {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Get active hero videos error:", error);
    throw error;
  }
};

// ============================================================
// ✅ GET ALL HERO VIDEOS (Admin)
// ============================================================
export const getAllHeroVideos = async (params = {}) => {
  try {
    const response = await API.get("/hero", { params });
    return response.data;
  } catch (error) {
    console.error("❌ Get all hero videos error:", error);
    throw error;
  }
};

// ============================================================
// ✅ GET SINGLE HERO VIDEO
// ============================================================
export const getHeroVideoById = async (id) => {
  try {
    const response = await API.get(`/hero/${id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Get hero video by id error:", error);
    throw error;
  }
};

// ============================================================
// ✅ CREATE HERO VIDEO
// ============================================================
export const createHeroVideo = async (data, onProgress) => {
  try {
    const response = await API.post("/hero", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progress) => {
        if (typeof onProgress === "function") {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Create hero video error:", error);
    throw error;
  }
};

// ============================================================
// ✅ UPDATE HERO VIDEO (Metadata only)
// ============================================================
export const updateHeroVideo = async (id, data) => {
  try {
    const response = await API.put(`/hero/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Update hero video error:", error);
    throw error;
  }
};

// ============================================================
// ✅ UPLOAD/REPLACE HERO VIDEO
// ============================================================
export const uploadHeroVideoFile = async (id, file, onProgress) => {
  try {
    const formData = new FormData();
    formData.append("heroVideo", file);

    const response = await API.post(`/hero/${id}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progress) => {
        if (typeof onProgress === "function") {
          const percent = Math.round((progress.loaded * 100) / progress.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Upload hero video error:", error);
    throw error;
  }
};

// ============================================================
// ✅ TOGGLE HERO VIDEO ACTIVE STATUS
// ============================================================
export const toggleHeroVideo = async (id, isActive) => {
  try {
    const response = await API.put(`/hero/${id}/toggle`, { isActive });
    return response.data;
  } catch (error) {
    console.error("❌ Toggle hero video error:", error);
    throw error;
  }
};

// ============================================================
// ✅ UPDATE PRIORITY
// ============================================================
export const updateHeroVideoPriority = async (id, priority) => {
  try {
    const response = await API.put(`/hero/${id}/priority`, { priority });
    return response.data;
  } catch (error) {
    console.error("❌ Update priority error:", error);
    throw error;
  }
};

// ============================================================
// ✅ DELETE HERO VIDEO
// ============================================================
export const deleteHeroVideo = async (id) => {
  try {
    const response = await API.delete(`/hero/${id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Delete hero video error:", error);
    throw error;
  }
};