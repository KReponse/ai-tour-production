// src/pages/provider/EditListing.jsx
// ✅ UPDATED - Cover Media (Image + Video support)
// ✅ FIXED: Gallery and Videos now REPLACE instead of APPEND
// ✅ FIXED: Media removal synchronizes properly

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin,
  DollarSign,
  Clock,
  Users,
  Video,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Upload,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  Info,
  Star,
  Shield,
  Zap,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { getListingById, updateListing } from '../../services/listingService';
import { getMyProviderProfile } from '../../services/providerService';
import { useAuth } from '../../contexts/AuthContext';
import {
  BIZ_CONFIG,
  SECTION_LABELS,
  getBusinessConfig,
  getBusinessTypeFromProvider,
} from '../../config/listingConfigs';
import {
  LISTING_TYPES,
  getCategoriesForType,
} from '../../constants/listingCategories';

// ── Brand tokens ─────────────────────────────────────────────────
const TEAL = '#0D9488';
const GOLD = '#F59E0B';
const SLATE = '#374151';

// ✅ API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Reuse styles from AddListing ──
const Label = ({ children, required, hint }) => (
  <div style={{ marginBottom: 6 }}>
    <label className="block text-sm font-bold text-[#374151] dark:text-white">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
    {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
  </div>
);

const Err = ({ msg }) =>
  msg ? (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle size={12} /> {msg}
    </p>
  ) : null;

const inputClassName = (err) => `
  w-full h-12 px-3.5
  border-2 rounded-xl text-sm outline-none
  bg-white dark:bg-gray-800
  text-[#374151] dark:text-white
  ${err 
    ? 'border-red-500 dark:border-red-500' 
    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
  }
  focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488]
  transition-all duration-200
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  font-sans
`;

const selectClassName = (err) => `
  w-full h-12 px-3.5 pr-10
  border-2 rounded-xl text-sm outline-none
  bg-white dark:bg-gray-800
  text-[#374151] dark:text-white
  ${err 
    ? 'border-red-500 dark:border-red-500' 
    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
  }
  focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488]
  transition-all duration-200
  appearance-none cursor-pointer
  font-sans
`;

const textareaClassName = (err) => `
  w-full px-3.5 py-3
  border-2 rounded-xl text-sm outline-none
  bg-white dark:bg-gray-800
  text-[#374151] dark:text-white
  ${err 
    ? 'border-red-500 dark:border-red-500' 
    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
  }
  focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488]
  transition-all duration-200
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  font-sans leading-relaxed resize-vertical min-h-[100px]
`;

const Card = ({ children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
    {children}
  </div>
);

const SectionCard = ({ id, config, children }) => {
  const [open, setOpen] = useState(true);
  const cfg = SECTION_LABELS[id] || { label: id, icon: FileText };
  const Icon = cfg.icon;
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0 mb-5 dark:text-white"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-[#0D9488]/10 dark:bg-[#0D9488]/20">
            <Icon size={17} color={config.accent} />
          </div>
          <span className="text-sm font-extrabold text-[#374151] dark:text-white">
            {cfg.label}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && children}
    </Card>
  );
};

const UploadZone = ({ label, hint, accept, multiple, onChange, icon: Icon, color = TEAL }) => (
  <label className={`
    flex items-center gap-3 p-3.5 rounded-xl
    border-2 border-dashed cursor-pointer transition-all duration-200
    ${color === TEAL ? 'border-[#0D9488]/30 dark:border-[#0D9488]/30 hover:border-[#0D9488] dark:hover:border-[#0D9488] bg-[#0D9488]/5 dark:bg-[#0D9488]/5 hover:bg-[#0D9488]/10 dark:hover:bg-[#0D9488]/10' : ''}
    ${color === GOLD ? 'border-[#F59E0B]/30 dark:border-[#F59E0B]/30 hover:border-[#F59E0B] dark:hover:border-[#F59E0B] bg-[#F59E0B]/5 dark:bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10 dark:hover:bg-[#F59E0B]/10' : ''}
  `}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[${color}]/15 dark:bg-[${color}]/20`}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <div className="text-sm font-bold text-[#374151] dark:text-white">{label}</div>
      {hint && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</div>}
    </div>
    <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />
  </label>
);

// ================================================================
// MAIN COMPONENT
// ================================================================
const EditListing = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [providerProfile, setProviderProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [coverMediaType, setCoverMediaType] = useState('image');
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverMediaFile, setCoverMediaFile] = useState(null);
  const [existingCoverMedia, setExistingCoverMedia] = useState(null);
  
  const [customCategory, setCustomCategory] = useState("");

  // ✅ FIXED: These now track ALL gallery images (existing + new)
  const [galleryPreview, setGalleryPreview] = useState([]);
  const [videoPreview, setVideoPreview] = useState([]);
  // ✅ FIXED: These track which files are from the server (to send back as existing)
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideos, setExistingVideos] = useState([]);

  const [form, setForm] = useState({
    title: '',
    location: '',
    category: '',
    price: '',
    duration: '',
    capacity: '',
    description: '',
    highlights: '',
    included: '',
    excluded: '',
    amenities: '',
    menu: '',
    meetingPoint: '',
    cancellationPolicy: '',
    requirements: '',
    refundPolicy: '',
    listingType: '',
    coverMedia: null,
    coverMediaType: 'image',
    coverImage: null,
    galleryImages: [],
    videos: [],
  });

  // ── Fetch Data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setProfileLoading(true);
        setLoading(true);

        console.log("🔍 Fetching listing with ID:", id);

        const profileData = await getMyProviderProfile();
        setProviderProfile(profileData.provider || profileData.request || null);

        const listingData = await getListingById(id);
        console.log("✅ Listing data received:", listingData);

        const listing = listingData.listing;

        if (!listing) {
          alert('Listing not found');
          navigate('/provider/listings');
          return;
        }

        const hasVideo = listing.videos && listing.videos.length > 0;
        const coverType = hasVideo ? 'video' : 'image';
        setCoverMediaType(coverType);

        setForm({
          title: listing.title || '',
          location: listing.location || '',
          category: listing.category || '',
          price: listing.price || '',
          duration: listing.duration || '',
          capacity: listing.capacity || '',
          description: listing.description || '',
          highlights: listing.highlights || '',
          included: listing.included || '',
          excluded: listing.excluded || '',
          amenities: listing.amenities || '',
          menu: listing.menu || '',
          meetingPoint: listing.meetingPoint || '',
          cancellationPolicy: listing.cancellationPolicy || '',
          requirements: listing.requirements || '',
          refundPolicy: listing.refundPolicy || '',
          listingType: listing.listingType || '',
          coverMedia: null,
          coverMediaType: coverType,
          coverImage: null,
          galleryImages: [],
          videos: [],
        });

        if (listing.category && !getCategoriesForType(listing.listingType || 'experience').includes(listing.category)) {
          setCustomCategory(listing.category);
          setForm((f) => ({ ...f, category: 'Other' }));
        }

        if (coverType === 'video' && listing.videos && listing.videos.length > 0) {
          const videoUrl = `${API_URL}/uploads/${listing.videos[0]}`;
          setCoverPreview(videoUrl);
          setExistingCoverMedia(listing.videos[0]);
          setExistingVideos(listing.videos);
        } else if (listing.coverImage) {
          setCoverPreview(`${API_URL}/uploads/${listing.coverImage}`);
          setExistingCoverMedia(listing.coverImage);
          setExistingImages([listing.coverImage]);
        }

        // ✅ FIXED: Set gallery images correctly
        if (listing.galleryImages?.length > 0) {
          setGalleryPreview(listing.galleryImages.map((img) => `${API_URL}/uploads/${img}`));
          setExistingImages(listing.galleryImages);
        }

        // ✅ FIXED: Set videos correctly (non-cover)
        if (listing.videos?.length > 0) {
          const startIndex = coverType === 'video' ? 1 : 0;
          const remainingVideos = listing.videos.slice(startIndex);
          if (remainingVideos.length > 0) {
            setVideoPreview(remainingVideos.map((vid) => `${API_URL}/uploads/${vid}`));
            setExistingVideos(remainingVideos);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        console.error('❌ Error response:', error.response);
        alert(`Failed to load listing: ${error.response?.data?.message || error.message}`);
        navigate('/provider/listings');
      } finally {
        setLoading(false);
        setProfileLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const businessType = getBusinessTypeFromProvider(providerProfile);
  const bizCfg = getBusinessConfig(businessType);
  const BizIcon = bizCfg.icon;
  const activeSections = bizCfg.sections || [];

  const validate = useCallback((name, value) => {
    if (name === 'title') {
      if (!value?.trim()) return 'Title is required';
      if (value.length < 5) return 'At least 5 characters';
    }
    if (name === 'location') {
      if (!value?.trim()) return 'Location is required';
    }
    if (name === 'category') {
      if (!value) return 'Select a category';
    }
    if (name === 'customCategory') {
      if (form.category === 'Other' && !value?.trim()) {
        return 'Please specify the category';
      }
    }
    if (name === 'price') {
      if (!value) return 'Price is required';
      if (Number(value) <= 0) return 'Must be greater than 0';
    }
    if (name === 'duration') {
      if (!value?.trim()) return 'Duration is required';
    }
    if (name === 'capacity') {
      if (!value) return 'Required';
      if (Number(value) < 1) return 'Invalid number';
    }
    if (name === 'description') {
      if (!value?.trim()) return 'Description is required';
      if (value.length < 30) return 'At least 30 characters';
    }
    if (name === 'coverMedia') {
      if (!value && !existingCoverMedia) return 'Cover media is required';
      if (value) {
        if (coverMediaType === 'image') {
          if (!value.type?.startsWith('image/')) return 'Must be an image (JPG, PNG, WEBP)';
          if (value.size > 15 * 1024 * 1024) return 'Max 15 MB';
        } else {
          if (!value.type?.startsWith('video/')) return 'Must be a video (MP4, MOV, WEBM)';
          if (value.size > 500 * 1024 * 1024) return 'Max 500 MB';
        }
      }
      return '';
    }
    return '';
  }, [form.category, coverMediaType, existingCoverMedia]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (touched[name]) setErrors((e) => ({ ...e, [name]: validate(name, value) }));
  };

  const touch = (name, value) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validate(name, value) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'listingType') {
      setForm((f) => ({ ...f, listingType: value, category: '' }));
      setCustomCategory('');
      setErrors((e) => ({ ...e, category: '', customCategory: '' }));
    } else {
      set(name, value);
    }
  };
  
  const handleBlur = (e) => touch(e.target.name, e.target.value);

  // ── File Handlers ──
  
  const handleCoverMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const err = validate('coverMedia', file);
    if (err) {
      setErrors((v) => ({ ...v, coverMedia: err }));
      return;
    }
    
    if (coverMediaType === 'video' && file.type?.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 300) {
          setErrors((v) => ({ ...v, coverMedia: 'Video max 5 minutes' }));
          return;
        }
        setCoverMediaFile(file);
        setCoverPreview(URL.createObjectURL(file));
        set('coverMedia', file);
        set('coverImage', file);
        setExistingCoverMedia(null);
      };
      video.src = URL.createObjectURL(file);
    } else {
      setCoverMediaFile(file);
      setCoverPreview(URL.createObjectURL(file));
      set('coverMedia', file);
      set('coverImage', file);
      setExistingCoverMedia(null);
    }
  };

  const resetCoverMedia = () => {
    setCoverPreview(null);
    setCoverMediaFile(null);
    set('coverMedia', null);
    set('coverImage', null);
    setExistingCoverMedia(null);
    setErrors((e) => ({ ...e, coverMedia: '' }));
  };

  const handleMediaTypeChange = (type) => {
    setCoverMediaType(type);
    resetCoverMedia();
  };

  // ✅ FIXED: Gallery handler - REPLACE instead of APPEND
  const handleGallery = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // ✅ REPLACE: New files become the entire gallery state
    // This ensures old files are removed unless they were kept via existingImages
    const newFiles = [...files];
    
    // Update form state with new files
    set('galleryImages', newFiles);
    
    // Update preview - combine existing (kept) + new uploads
    const existingPreviews = existingImages.map((img) => `${API_URL}/uploads/${img}`);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setGalleryPreview([...existingPreviews, ...newPreviews]);
  };

  // ✅ FIXED: Videos handler - REPLACE instead of APPEND
  const handleVideos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    // Validate video durations
    for (const f of files) {
      const dur = await new Promise((res) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(v.src);
          res(v.duration);
        };
        v.src = URL.createObjectURL(f);
      });
      if (dur > 300) {
        setErrors((err) => ({ ...err, videos: 'Each video max 5 minutes' }));
        return;
      }
    }
    
    // ✅ REPLACE: New files become the entire videos state
    const newFiles = [...files];
    
    // Update form state with new files
    set('videos', newFiles);
    
    // Update preview - combine existing (kept) + new uploads
    const existingPreviews = existingVideos.map((vid) => `${API_URL}/uploads/${vid}`);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setVideoPreview([...existingPreviews, ...newPreviews]);
  };

  // ✅ FIXED: Remove file function - properly handles all cases
  const removeFile = (type, index) => {
    if (type === 'cover') {
      resetCoverMedia();
      return;
    }
    
    if (type === 'gallery') {
      // Get the filename or URL at this index
      const previewItem = galleryPreview[index];
      
      // Check if this is an existing image (from server) or a new upload
      const isExisting = existingImages.some((img) => {
        const previewUrl = `${API_URL}/uploads/${img}`;
        return previewUrl === previewItem;
      });
      
      if (isExisting) {
        // Remove from existingImages
        const newExisting = existingImages.filter((_, i) => {
          const previewUrl = `${API_URL}/uploads/${existingImages[i]}`;
          return previewUrl !== previewItem;
        });
        setExistingImages(newExisting);
      } else {
        // Remove from new uploads (form.galleryImages)
        const newUploads = form.galleryImages.filter((_, i) => {
          const previewUrl = URL.createObjectURL(form.galleryImages[i]);
          return previewUrl !== previewItem && previewUrl !== `${API_URL}/uploads/${form.galleryImages[i]}`;
        });
        // Simplified: Just filter by index in the combined list
        // Since we can't reliably identify, we rebuild from existing + form
        const totalExisting = existingImages.length;
        if (index < totalExisting) {
          // It's existing, remove from existingImages
          const newExisting = existingImages.filter((_, i) => i !== index);
          setExistingImages(newExisting);
        } else {
          // It's a new upload
          const newUploadIndex = index - totalExisting;
          const newUploads = form.galleryImages.filter((_, i) => i !== newUploadIndex);
          set('galleryImages', newUploads);
        }
      }
      
      // Update preview
      const newPreview = galleryPreview.filter((_, i) => i !== index);
      setGalleryPreview(newPreview);
    }
    
    if (type === 'video') {
      const previewItem = videoPreview[index];
      
      const isExisting = existingVideos.some((vid) => {
        const previewUrl = `${API_URL}/uploads/${vid}`;
        return previewUrl === previewItem;
      });
      
      if (isExisting) {
        const newExisting = existingVideos.filter((_, i) => {
          const previewUrl = `${API_URL}/uploads/${existingVideos[i]}`;
          return previewUrl !== previewItem;
        });
        setExistingVideos(newExisting);
      } else {
        const totalExisting = existingVideos.length;
        if (index < totalExisting) {
          const newExisting = existingVideos.filter((_, i) => i !== index);
          setExistingVideos(newExisting);
        } else {
          const newUploadIndex = index - totalExisting;
          const newUploads = form.videos.filter((_, i) => i !== newUploadIndex);
          set('videos', newUploads);
        }
      }
      
      const newPreview = videoPreview.filter((_, i) => i !== index);
      setVideoPreview(newPreview);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    const required = ['title', 'location', 'category', 'price', 'duration', 'capacity', 'description', 'coverMedia'];
    if (form.category === 'Other') {
      required.push('customCategory');
    }
    
    const newErr = {};
    required.forEach((k) => {
      const val = k === 'customCategory' ? customCategory : form[k];
      const err = validate(k, val);
      if (err) newErr[k] = err;
    });
    setErrors(newErr);
    setTouched(Object.fromEntries(required.map((k) => [k, true])));
    if (Object.keys(newErr).length > 0) {
      document.getElementById('edit-listing-top')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(10);

      const data = new FormData();
      
      const fields = [
        'title',
        'location',
        'price',
        'duration',
        'capacity',
        'description',
        'highlights',
        'included',
        'excluded',
        'amenities',
        'menu',
        'meetingPoint',
        'cancellationPolicy',
        'requirements',
        'refundPolicy',
        'listingType',
      ];
      fields.forEach((k) => data.append(k, form[k] || ''));

      const finalCategory = form.category === 'Other' 
        ? customCategory 
        : form.category || '';
      data.append('category', finalCategory);

      // ✅ Send existing media to backend so it knows what to keep
      data.append('existingImages', JSON.stringify(existingImages));
      data.append('existingVideos', JSON.stringify(existingVideos));

      // ✅ Cover Media
      if (form.coverMedia instanceof File) {
        data.append('coverMedia', form.coverMedia);
        data.append('coverMediaType', coverMediaType);
        data.append('coverImage', form.coverMedia);
      } else if (existingCoverMedia) {
        // Keep existing cover - add it to existing lists so backend keeps it
        if (coverMediaType === 'video') {
          if (!existingVideos.includes(existingCoverMedia)) {
            existingVideos.unshift(existingCoverMedia);
            data.set('existingVideos', JSON.stringify(existingVideos));
          }
        } else {
          if (!existingImages.includes(existingCoverMedia)) {
            existingImages.unshift(existingCoverMedia);
            data.set('existingImages', JSON.stringify(existingImages));
          }
        }
        // Send coverMediaType to backend
        data.append('coverMediaType', coverMediaType);
      }

      // ✅ Gallery Images (new uploads only)
      form.galleryImages.forEach((img) => {
        if (img instanceof File) data.append('galleryImages', img);
      });

      // ✅ Videos (new uploads only, non-cover)
      form.videos.forEach((vid) => {
        if (vid instanceof File) data.append('videos', vid);
      });

      await updateListing(id, data, token, (p) => setUploadProgress(p));

      setUploadProgress(100);
      alert('✅ Listing updated successfully!');
      navigate('/provider/listings');
    } catch (error) {
      console.error('❌ Update error:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to update listing' });
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading listing...</p>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-5 pb-20 font-sans">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        input:focus,select:focus,textarea:focus{border-color:#0D9488!important;box-shadow:0 0 0 3px #0D948822!important}
      `}</style>

      <div
        id="edit-listing-top"
        className="max-w-[760px] mx-auto animate-[fadeUp_.35s_ease]"
      >
        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: `linear-gradient(135deg, ${bizCfg.accent}, ${GOLD})`,
              boxShadow: `0 8px 24px ${bizCfg.accent}40`,
            }}
          >
            <BizIcon size={28} color="#fff" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#374151] dark:text-white m-0">
            Edit Listing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Update your listing details
          </p>
        </div>

        {/* ── Provider Banner ── */}
        {providerProfile && (
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl mb-6 bg-[#0D9488]/10 dark:bg-[#0D9488]/10 border border-[#0D9488]/30 dark:border-[#0D9488]/30">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${bizCfg.accent}, ${GOLD})` }}
            >
              <BizIcon size={20} color="#fff" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-extrabold text-[#374151] dark:text-white">
                {providerProfile.businessName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {bizCfg.label} · {providerProfile.city}, {providerProfile.country}
              </div>
            </div>
          </div>
        )}

        {/* ── Submit Error ── */}
        {errors.submit && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-5 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={16} /> {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── BASIC INFO ── */}
          {activeSections.includes('basic') && (
            <SectionCard id="basic" config={bizCfg}>
              <div className="mb-4">
                <Label required>Listing Type</Label>
                <div className="relative">
                  <select
                    name="listingType"
                    value={form.listingType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={selectClassName(!!errors.listingType)}
                  >
                    <option value="">Select listing type...</option>
                    {LISTING_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                  />
                </div>
                <Err msg={errors.listingType} />
              </div>

              <div className="mb-4">
                <Label required>Title</Label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Amazing Experience"
                  className={inputClassName(!!errors.title)}
                />
                <Err msg={errors.title} />
              </div>

              <div className="mb-4">
                <Label required>Location</Label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  />
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Musanze, Northern Rwanda"
                    className={`${inputClassName(!!errors.location)} pl-10`}
                  />
                </div>
                <Err msg={errors.location} />
              </div>

              <div className="mb-4">
                <Label required>Category</Label>
                <div className="relative">
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={selectClassName(!!errors.category)}
                    disabled={!form.listingType}
                  >
                    <option value="">
                      {form.listingType ? 'Select category...' : 'Select listing type first'}
                    </option>
                    {form.listingType && getCategoriesForType(form.listingType).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                  />
                </div>
                <Err msg={errors.category} />
              </div>

              {form.category === 'Other' && (
                <div className="mb-4">
                  <Label required>Specify Category</Label>
                  <input
                    name="customCategory"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      touch('customCategory', e.target.value);
                    }}
                    onBlur={handleBlur}
                    placeholder="e.g., Yoga Retreat, Photography Expedition, etc."
                    className={inputClassName(!!errors.customCategory)}
                  />
                  <Err msg={errors.customCategory} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
                <div>
                  <Label required>Price</Label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="150"
                    className={inputClassName(!!errors.price)}
                  />
                  <Err msg={errors.price} />
                </div>
                <div>
                  <Label required>Duration</Label>
                  <input
                    name="duration"
                    value={form.duration}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="2 Days / 1 Night"
                    className={inputClassName(!!errors.duration)}
                  />
                  <Err msg={errors.duration} />
                </div>
              </div>

              <div>
                <Label required>Capacity</Label>
                <input
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="8"
                  className={inputClassName(!!errors.capacity)}
                />
                <Err msg={errors.capacity} />
              </div>
            </SectionCard>
          )}

          {/* ── MEDIA SECTION ── */}
          {activeSections.includes('media') && (
            <SectionCard id="media" config={bizCfg}>
              <div className="mb-4.5">
                <Label required>Cover Media</Label>

                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151] dark:text-white">
                    <input
                      type="radio"
                      name="coverMediaType"
                      value="image"
                      checked={coverMediaType === 'image'}
                      onChange={() => handleMediaTypeChange('image')}
                      className="w-4 h-4 accent-[#0D9488]"
                    />
                    <ImageIcon size={16} className="text-[#0D9488]" />
                    Image
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151] dark:text-white">
                    <input
                      type="radio"
                      name="coverMediaType"
                      value="video"
                      checked={coverMediaType === 'video'}
                      onChange={() => handleMediaTypeChange('video')}
                      className="w-4 h-4 accent-[#0D9488]"
                    />
                    <Video size={16} className="text-[#0D9488]" />
                    Video
                  </label>
                </div>

                {!coverPreview ? (
                  coverMediaType === 'image' ? (
                    <UploadZone
                      label="Upload Cover Image"
                      hint="JPG, PNG, WEBP · Max 15 MB"
                      accept="image/*"
                      onChange={handleCoverMedia}
                      icon={Camera}
                      color={bizCfg.accent}
                    />
                  ) : (
                    <UploadZone
                      label="Upload Cover Video"
                      hint="MP4, MOV, WEBM · Max 500 MB · Max 5 minutes"
                      accept="video/*"
                      onChange={handleCoverMedia}
                      icon={Video}
                      color={bizCfg.accent}
                    />
                  )
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    {coverMediaType === 'image' ? (
                      <img
                        src={coverPreview}
                        alt="Cover"
                        className="w-full h-[220px] object-cover block"
                      />
                    ) : (
                      <video
                        src={coverPreview}
                        controls
                        className="w-full rounded-xl max-h-[220px] bg-black"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile('cover')}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-red-500 border-none cursor-pointer flex items-center justify-center hover:bg-red-600 transition"
                    >
                      <X size={16} color="#fff" />
                    </button>
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded bg-black/60 text-white text-xs">
                      {coverMediaType === 'image' ? '📷 Image' : '🎬 Video'}
                    </div>
                  </div>
                )}
                <Err msg={errors.coverMedia} />
              </div>

              {/* Gallery Images */}
              <div className="mb-4.5">
                <Label>Gallery Images</Label>
                <UploadZone
                  label="Upload Gallery Photos"
                  hint="Max 15 images · 15 MB each"
                  accept="image/*"
                  multiple
                  onChange={handleGallery}
                  icon={ImageIcon}
                  color={GOLD}
                />
                <Err msg={errors.galleryImages} />
                {galleryPreview.length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2 mt-3">
                    {galleryPreview.map((img, i) => (
                      <div key={i} className="relative h-20 rounded-xl overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile('gallery', i)}
                          className="absolute top-1 right-1 w-5.5 h-5.5 rounded-full bg-red-500 border-none cursor-pointer flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <X size={11} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Videos (non-cover) */}
              <div>
                <Label>Additional Videos (optional)</Label>
                <UploadZone
                  label="Upload Videos"
                  hint="Max 3 videos · 5 min each · 500 MB each"
                  accept="video/*"
                  multiple
                  onChange={handleVideos}
                  icon={Video}
                  color={bizCfg.accent}
                />
                <Err msg={errors.videos} />
                {videoPreview.length > 0 && (
                  <div className="flex flex-col gap-2.5 mt-3">
                    {videoPreview.map((vid, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden">
                        <video
                          src={vid}
                          controls
                          className="w-full rounded-xl max-h-[240px] bg-black"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('video', i)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-red-500 border-none cursor-pointer flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <X size={15} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ── DESCRIPTION ── */}
          {activeSections.includes('description') && (
            <SectionCard id="description" config={bizCfg}>
              <Label required>Description</Label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Describe your listing..."
                rows={6}
                className={textareaClassName(!!errors.description)}
              />
              <div className="flex justify-between items-center mt-1">
                <Err msg={errors.description} />
                <span className={`text-xs ${form.description.length < 30 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {form.description.length} / 30 min
                </span>
              </div>
            </SectionCard>
          )}

          {/* ── HIGHLIGHTS ── */}
          {activeSections.includes('highlights') && (
            <SectionCard id="highlights" config={bizCfg}>
              <Label>Key Highlights</Label>
              <textarea
                name="highlights"
                value={form.highlights}
                onChange={handleChange}
                placeholder="One highlight per line..."
                rows={5}
                className={textareaClassName(false)}
              />
            </SectionCard>
          )}

          {/* ── AMENITIES ── */}
          {activeSections.includes('amenities') && (
            <SectionCard id="amenities" config={bizCfg}>
              <Label>Amenities</Label>
              <textarea
                name="amenities"
                value={form.amenities}
                onChange={handleChange}
                placeholder="WiFi, Pool, Restaurant..."
                rows={5}
                className={textareaClassName(false)}
              />
            </SectionCard>
          )}

          {/* ── MENU ── */}
          {activeSections.includes('menu') && (
            <SectionCard id="menu" config={bizCfg}>
              <Label>Menu & Offerings</Label>
              <textarea
                name="menu"
                value={form.menu}
                onChange={handleChange}
                placeholder="Signature dishes..."
                rows={5}
                className={textareaClassName(false)}
              />
            </SectionCard>
          )}

          {/* ── INCLUDED ── */}
          {activeSections.includes('included') && (
            <SectionCard id="included" config={bizCfg}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>What's Included</Label>
                  <textarea
                    name="included"
                    value={form.included}
                    onChange={handleChange}
                    placeholder="Permit, Guide, Lunch..."
                    rows={5}
                    className={textareaClassName(false)}
                  />
                </div>
                <div>
                  <Label>What's Not Included</Label>
                  <textarea
                    name="excluded"
                    value={form.excluded}
                    onChange={handleChange}
                    placeholder="Flights, Insurance..."
                    rows={5}
                    className={textareaClassName(false)}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── REQUIREMENTS ── */}
          {activeSections.includes('requirements') && (
            <SectionCard id="requirements" config={bizCfg}>
              <Label>Requirements</Label>
              <textarea
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                placeholder="Fitness, Age, Gear..."
                rows={5}
                className={textareaClassName(false)}
              />
            </SectionCard>
          )}

          {/* ── LOGISTICS ── */}
          {activeSections.includes('logistics') && (
            <SectionCard id="logistics" config={bizCfg}>
              <Label>Meeting Point</Label>
              <input
                name="meetingPoint"
                value={form.meetingPoint}
                onChange={handleChange}
                placeholder="e.g. Kigali Serena Hotel"
                className={inputClassName(false)}
              />
            </SectionCard>
          )}

          {/* ── POLICY ── */}
          {activeSections.includes('policy') && (
            <SectionCard id="policy" config={bizCfg}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cancellation Policy</Label>
                  <textarea
                    name="cancellationPolicy"
                    value={form.cancellationPolicy}
                    onChange={handleChange}
                    placeholder="Free cancellation 48 hours prior..."
                    rows={4}
                    className={textareaClassName(false)}
                  />
                </div>
                <div>
                  <Label>Refund Policy</Label>
                  <textarea
                    name="refundPolicy"
                    value={form.refundPolicy}
                    onChange={handleChange}
                    placeholder="Full refund 7+ days prior..."
                    rows={4}
                    className={textareaClassName(false)}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── SUBMIT ── */}
          <div className="sticky bottom-5 z-10">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/provider/listings')}
                className="flex-none h-14 px-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-[#374151] dark:text-white font-extrabold text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-sans"
              >
                <ArrowLeft size={18} /> Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 h-14 border-none rounded-xl font-extrabold text-base flex items-center justify-center gap-2.5 transition-all duration-200 font-sans ${
                  submitting
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : `text-white shadow-lg hover:scale-[1.015]`
                }`}
                style={{
                  background: submitting 
                    ? undefined 
                    : `linear-gradient(135deg, ${bizCfg.accent} 0%, ${GOLD} 100%)`,
                  boxShadow: submitting 
                    ? undefined 
                    : `0 6px 24px ${bizCfg.accent}45`,
                }}
              >
                {submitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Updating {uploadProgress}%...</>
                ) : (
                  <><Save size={20} /> Update Listing</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditListing;