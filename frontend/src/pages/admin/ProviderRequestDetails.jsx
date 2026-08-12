// src/pages/admin/ProviderRequestDetails.jsx
// ✅ COMPLETE FIXED - Fixed action handlers with optimistic updates
// ✅ No more window.location.reload()
// ✅ Actions update UI immediately

import React, { useEffect, useState, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  X, Building2, User, Phone, Mail, MapPin, Globe, Clock,
  FileText, Image, Camera, DollarSign, CreditCard, Shield,
  BookOpen, CheckCircle, XCircle, AlertCircle, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Download, Eye,
  Calendar, Languages, Award, Briefcase, Facebook, Instagram,
  Twitter, Linkedin, Youtube, Music2, Send, MessageCircle,
  BadgeCheck, FileCheck, Sparkles, RefreshCw,
} from "lucide-react";
import { getProviderRequestById, updateProviderRequest } from "../../services/adminService";
import { getImageUrl } from "../../utils/mediaHelpers";
import toast from "react-hot-toast";

// ── Brand tokens ─────────────────────────────────────────────────
const TEAL = "#0D9488";
const GOLD = "#F59E0B";
const SLATE = "#374151";

// ── Helpers ──────────────────────────────────────────────────────
const toUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("blob:")) return path;
  return getImageUrl(path);
};

const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

// ✅ Supports images AND PDFs
const isImg = (f) => /\.(jpg|jpeg|png|gif|webp|heic|heif|svg)$/i.test(f || "");
const isPdf = (f) => /\.pdf$/i.test(f || "");
const isDoc = (f) => /\.(doc|docx|odt)$/i.test(f || "");

const getFileIcon = (filename) => {
  if (isPdf(filename)) return "PDF";
  if (isDoc(filename)) return "DOC";
  const ext = filename?.split(".").pop()?.toUpperCase() || "FILE";
  return ext;
};

const getFileColor = (filename) => {
  if (isPdf(filename)) return "text-red-500 dark:text-red-400";
  if (isDoc(filename)) return "text-blue-500 dark:text-blue-400";
  return "text-[#F59E0B]";
};

const getFileBgColor = (filename) => {
  if (isPdf(filename)) return "bg-red-50 dark:bg-red-900/20";
  if (isDoc(filename)) return "bg-blue-50 dark:bg-blue-900/20";
  return "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20";
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";

// ── Status config ────────────────────────────────────────────────
const STATUS = {
  approved:          { bg: "bg-[#0D9488]/10 dark:bg-[#0D9488]/20",    color: "text-[#0D9488] dark:text-[#0D9488]",     border: "border-[#0D9488]/30 dark:border-[#0D9488]/20",    icon: CheckCircle,  label: "Approved"       },
  rejected:          { bg: "bg-red-100 dark:bg-red-900/20",       color: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800",     icon: XCircle,      label: "Rejected"       },
  needs_information: { bg: "bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20",    color: "text-[#B45309] dark:text-[#F59E0B]", border: "border-[#F59E0B]/30 dark:border-[#F59E0B]/20",   icon: AlertCircle,  label: "Needs Info"     },
  pending:           { bg: "bg-gray-100 dark:bg-gray-800",       color: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700",   icon: Clock,        label: "Pending Review" },
};
const getStatus = (s) => STATUS[s?.toLowerCase()] || STATUS.pending;

// ── Components ──────────────────────────────────────────────────
const StatusBadge = memo(({ status, large }) => {
  const cfg = getStatus(status);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide ${
      large ? "px-5 py-2 text-sm" : "px-3 py-1 text-xs"
    } ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon size={large ? 16 : 12} /> {cfg.label}
    </span>
  );
});

const InfoRow = memo(({ label, value, link, mono }) => {
  if (!value || value === "N/A" || value === "" || value === "—") return null;
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
          className="text-sm font-semibold text-[#0D9488] dark:text-[#0D9488] hover:underline flex items-center gap-1 break-all">
          {value.replace(/^https?:\/\//, "")} <ExternalLink size={11} />
        </a>
      ) : (
        <div className={`text-sm font-semibold text-[#374151] dark:text-white break-words ${mono ? "font-mono" : ""}`}>{value}</div>
      )}
    </div>
  );
});

const Section = memo(({ title, icon: Icon, expanded, onToggle, children, accent = true }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-[#0D9488]/10 dark:bg-[#0D9488]/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <Icon size={16} className={accent ? "text-[#0D9488]" : "text-gray-400 dark:text-gray-500"} />
        </div>
        <span className="text-sm font-bold text-[#374151] dark:text-white">{title}</span>
      </div>
      {expanded ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
    </button>
    {expanded && <div className="px-4 pb-4">{children}</div>}
  </div>
));

// ── Document Card - Supports Images and PDFs ──
const DocCard = memo(({ src, label, onZoom }) => {
  if (!src) return null;
  const url = toUrl(src);
  const isIm = isImg(src);
  const isPdfFile = isPdf(src);
  const fileExt = getFileIcon(src);
  const fileColor = getFileColor(src);
  const fileBgColor = getFileBgColor(src);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#0D9488]/30">
      {isIm ? (
        <div onClick={() => onZoom(url)} className="h-24 cursor-zoom-in overflow-hidden relative bg-gray-200 dark:bg-gray-700">
          <img 
            src={url} 
            alt={label} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              e.target.style.display = "none";
              const parent = e.target.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className = "w-full h-full flex items-center justify-center text-gray-400";
                fallback.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
                parent.appendChild(fallback);
              }
            }}
          />
          <div className="absolute top-2 right-2 bg-black/60 dark:bg-black/70 rounded-lg px-2 py-0.5">
            <Eye size={12} className="text-white" />
          </div>
        </div>
      ) : (
        <div className={`h-24 flex flex-col items-center justify-center ${fileBgColor}`}>
          <FileText size={32} className={fileColor} />
          <span className={`text-xs font-bold mt-1 ${fileColor}`}>{fileExt}</span>
        </div>
      )}
      <div className="p-3">
        <div className="text-xs font-bold text-[#374151] dark:text-white truncate">{label}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-semibold text-[#0D9488] dark:text-[#0D9488] hover:underline flex items-center gap-1 transition-colors"
          >
            <Eye size={10} /> View
          </a>
          <a 
            href={url} 
            download 
            className="text-xs font-semibold text-[#0D9488] dark:text-[#0D9488] hover:underline flex items-center gap-1 transition-colors"
          >
            <Download size={10} /> Save
          </a>
          {isIm && (
            <button 
              onClick={() => onZoom(url)} 
              className="text-xs font-semibold text-[#F59E0B] hover:underline flex items-center gap-1 transition-colors"
            >
              <Image size={10} /> Zoom
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Social Link ──
const SocialLink = memo(({ url, label, icon: Icon }) => {
  if (!url) return null;
  return (
    <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#0D9488] transition text-sm font-semibold text-[#374151] dark:text-white">
      <Icon size={16} className="text-[#0D9488] flex-shrink-0" />
      <span className="truncate flex-1">{label}</span>
      <ExternalLink size={12} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
    </a>
  );
});

// ── MAIN COMPONENT ─────────────────────────────────────────────
const ProviderRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [sections, setSections] = useState({
    personal: true,
    business: true,
    legal: false,
    profile: false,
    social: false,
    hours: false,
    payment: false,
    agreements: false,
    application: true,
  });
  const [zoom, setZoom] = useState(null);
  const [notes, setNotes] = useState("");

  // ── Fetch Request ─────────────────────────────────────────────
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProviderRequestById(id);
        
        if (data.success && data.request) {
          setRequest(data.request);
          setNotes(data.request.adminNotes || "");
        } else {
          setError(data.message || "Failed to load request details");
        }
      } catch (error) {
        console.error("Error fetching request:", error);
        setError(error.response?.data?.message || error.message || "Failed to load request details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequest();
    }
  }, [id]);

  // ── ✅ FIXED: Actions with optimistic updates ────────────────
  const handleApprove = useCallback(async () => {
    if (!window.confirm("Are you sure you want to approve this provider?")) return;
    if (actionLoading) return; // ✅ Prevent duplicate submissions
    
    try {
      setActionLoading("approve");
      await updateProviderRequest(id, "approved", notes);
      
      // ✅ Update local state immediately
      setRequest(prev => ({
        ...prev,
        status: "approved",
        reviewedAt: new Date().toISOString(),
        adminNotes: notes,
      }));
      
      toast.success("Provider approved successfully! 🎉");
      
      // ✅ Navigate back after 1.5 seconds
      setTimeout(() => {
        navigate('/admin/provider-requests');
      }, 1500);
      
    } catch (error) {
      console.error("Error approving:", error);
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }, [id, notes, actionLoading, navigate]);

  const handleReject = useCallback(async () => {
    if (!notes.trim()) {
      toast.error("Please add a reason in the Admin Notes before rejecting.");
      return;
    }
    if (!window.confirm("Are you sure you want to reject this provider?")) return;
    if (actionLoading) return; // ✅ Prevent duplicate submissions
    
    try {
      setActionLoading("reject");
      await updateProviderRequest(id, "rejected", notes);
      
      // ✅ Update local state immediately
      setRequest(prev => ({
        ...prev,
        status: "rejected",
        reviewedAt: new Date().toISOString(),
        adminNotes: notes,
      }));
      
      toast.error("Provider rejected.");
      
      // ✅ Navigate back after 1.5 seconds
      setTimeout(() => {
        navigate('/admin/provider-requests');
      }, 1500);
      
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }, [id, notes, actionLoading, navigate]);

  const handleNeedInfo = useCallback(async () => {
    if (!notes.trim()) {
      toast.error("Please add a note explaining what information is needed.");
      return;
    }
    if (actionLoading) return; // ✅ Prevent duplicate submissions
    
    try {
      setActionLoading("needinfo");
      await updateProviderRequest(id, "needs_information", notes);
      
      // ✅ Update local state immediately
      setRequest(prev => ({
        ...prev,
        status: "needs_information",
        adminNotes: notes,
      }));
      
      toast.success("Request for information sent.");
      
    } catch (error) {
      console.error("Error requesting info:", error);
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setActionLoading(null);
    }
  }, [id, notes, actionLoading]);

  const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading provider details...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
          Failed to Load Details
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Retry
        </button>
        <button
          onClick={() => navigate('/admin/provider-requests')}
          className="mt-3 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Back to Requests
        </button>
      </div>
    );
  }

  // ── Not Found ──────────────────────────────────────────────────
  if (!request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#374151] dark:text-white mb-2">
          Request Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The provider request you're looking for does not exist.
        </p>
        <button
          onClick={() => navigate('/admin/provider-requests')}
          className="px-6 py-3 rounded-xl bg-[#0D9488] text-white font-bold hover:bg-[#0D9488]/80 transition"
        >
          Back to Requests
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const socialLinks = [
    { key: "facebook", label: "Facebook", icon: Facebook },
    { key: "instagram", label: "Instagram", icon: Instagram },
    { key: "twitter", label: "X / Twitter", icon: Twitter },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin },
    { key: "youtube", label: "YouTube", icon: Youtube },
    { key: "tiktok", label: "TikTok", icon: Music2 },
  ].filter(s => request[s.key]);

  const agreements = [
    { key: "agreeToTerms", label: "Terms of Service" },
    { key: "agreeToPrivacy", label: "Privacy Policy" },
    { key: "agreeToConduct", label: "Code of Conduct" },
    { key: "agreeToCommission", label: "Commission Agreement" },
    { key: "agreeToTourism", label: "Tourism Compliance" },
    { key: "agreeToAccurate", label: "Accurate Information" },
  ];

  const docs = [
    { key: "nationalIdFile", label: "National ID / Passport" },
    { key: "rdbCertificateFile", label: "RDB Certificate" },
    { key: "tinCertificateFile", label: "TIN Certificate" },
    { key: "businessRegistrationFile", label: "Business Registration" },
    { key: "tourismLicenseFile", label: "Tourism License" },
    { key: "insuranceFile", label: "Insurance Certificate" },
  ].filter(d => request[d.key]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Back Button ── */}
        <button
          onClick={() => navigate('/admin/provider-requests')}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#0D9488] dark:hover:text-[#0D9488] transition mb-4"
        >
          ← Back to Requests
        </button>

        {/* ── Header ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#F59E0B] flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#374151] dark:text-white">{request.businessName || "Provider Application"}</div>
              <div className="text-sm text-gray-400 dark:text-gray-500">ID: {request._id?.slice(-8).toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={request.status} large />
          </div>
        </div>

        <div className="space-y-4">

          {/* ── Status Banner ── */}
          {(() => {
            const statusConfig = getStatus(request.status);
            return (
              <div className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${statusConfig.bg} ${statusConfig.border}`}>
                <div className="flex items-center gap-3">
                  {(() => { const Icon = statusConfig.icon; return <Icon size={20} className={statusConfig.color} />; })()}
                  <div>
                    <div className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Submitted {fmt(request.createdAt)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Last updated {fmt(request.updatedAt)}</div>
              </div>
            );
          })()}

          {/* ============================================ */}
          {/* SECTION 1: PERSONAL INFORMATION */}
          {/* ============================================ */}
          <Section title="Personal Information" icon={User} expanded={sections.personal} onToggle={() => toggle("personal")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="Full Name" value={request.fullName} />
              <InfoRow label="Personal Email" value={request.email || request.user?.email} />
              <InfoRow label="Personal Phone" value={request.phone} />
              <InfoRow label="WhatsApp" value={request.whatsapp} />
              <InfoRow label="Nationality" value={request.nationality} />
              <InfoRow label="Business Email" value={request.businessEmail} />
              <InfoRow label="Alternate Phone" value={request.alternatePhone} />
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 2: BUSINESS INFORMATION */}
          {/* ============================================ */}
          <Section title="Business Information" icon={Building2} expanded={sections.business} onToggle={() => toggle("business")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="Business Name" value={request.businessName} />
              <InfoRow label="Business Type" value={capitalize(request.businessType)} />
              <InfoRow label="Business Phone" value={request.businessPhone} />
              <InfoRow label="Business Address" value={request.businessAddress} />
              <InfoRow label="Country" value={request.country} />
              <InfoRow label="Province" value={request.province} />
              <InfoRow label="District" value={request.district} />
              <InfoRow label="City" value={request.city} />
              <InfoRow label="Street" value={request.street} />
              <InfoRow label="Google Maps" value={request.googleMaps} link />
              <InfoRow label="Website" value={request.website} link />
              <InfoRow label="Starting Price" value={request.price ? `${request.currency || "USD"} ${Number(request.price).toLocaleString()}` : null} />
              <InfoRow label="Currency" value={request.currency} />
              <InfoRow label="Availability" value={request.availability} />
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 3: LEGAL DOCUMENTS */}
          {/* ============================================ */}
          <Section title="Legal Documents" icon={Shield} expanded={sections.legal} onToggle={() => toggle("legal")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="National ID Number" value={request.nationalId} mono />
              <InfoRow label="TIN Number" value={request.tinNumber} mono />
              <InfoRow label="RDB Registration" value={request.rdbRegistration} mono />
              <InfoRow label="Tourism License Number" value={request.tourismLicense} mono />
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {docs.map(d => (
                <DocCard key={d.key} src={request[d.key]} label={d.label} onZoom={setZoom} />
              ))}
              {docs.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full">No legal documents uploaded</p>
              )}
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 4: BUSINESS PROFILE */}
          {/* ============================================ */}
          <Section title="Business Profile" icon={Briefcase} expanded={sections.profile} onToggle={() => toggle("profile")}>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Description</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  {request.description || "No description provided"}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <InfoRow label="Languages" value={request.languages?.length > 0 ? request.languages.join(", ") : "N/A"} />
                <InfoRow label="Specializations" value={request.specializations?.length > 0 ? request.specializations.join(", ") : "N/A"} />
                <InfoRow label="Years of Experience" value={request.yearsOfExperience} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Business Logo</div>
                  {request.logo ? (
                    <img src={toUrl(request.logo)} alt="Logo" className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-zoom-in" onClick={() => setZoom(toUrl(request.logo))} />
                  ) : <p className="text-sm text-gray-500 dark:text-gray-400">No logo uploaded</p>}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cover Image</div>
                  {request.coverImage ? (
                    <img src={toUrl(request.coverImage)} alt="Cover" className="w-32 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-zoom-in" onClick={() => setZoom(toUrl(request.coverImage))} />
                  ) : <p className="text-sm text-gray-500 dark:text-gray-400">No cover image uploaded</p>}
                </div>
              </div>
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 5: SOCIAL MEDIA */}
          {/* ============================================ */}
          {socialLinks.length > 0 && (
            <Section title="Social Media" icon={Globe} expanded={sections.social} onToggle={() => toggle("social")}>
              <div className="space-y-2">
                {socialLinks.map(s => (
                  <SocialLink key={s.key} url={request[s.key]} label={s.label} icon={s.icon} />
                ))}
              </div>
            </Section>
          )}

          {/* ============================================ */}
          {/* SECTION 6: BUSINESS HOURS */}
          {/* ============================================ */}
          <Section title="Business Hours" icon={Clock} expanded={sections.hours} onToggle={() => toggle("hours")}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DAYS.map((day, idx) => {
                const h = request.businessHours?.[day] || {};
                return (
                  <div key={day} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-xs font-bold text-[#374151] dark:text-white uppercase">{DAY_LABELS[idx]}</div>
                    {h.closed
                      ? <div className="text-xs font-semibold text-red-500 dark:text-red-400">Closed</div>
                      : h.open && h.close
                      ? <div className="text-xs text-gray-600 dark:text-gray-300">{h.open} – {h.close}</div>
                      : <div className="text-xs text-gray-400 dark:text-gray-500">Not set</div>}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 7: PAYMENT INFORMATION */}
          {/* ============================================ */}
          <Section title="Payment Information" icon={CreditCard} expanded={sections.payment} onToggle={() => toggle("payment")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="Payment Method" value={capitalize(request.paymentMethod)} />
              <InfoRow label="Bank Name" value={request.bankName} />
              <InfoRow label="Account Name" value={request.accountName} />
              <InfoRow label="Account Number" value={request.accountNumber} mono />
              <InfoRow label="SWIFT Code" value={request.swiftCode} mono />
              <InfoRow label="Mobile Money" value={request.mobileMoney} />
              <InfoRow label="Payment Currency" value={request.paymentCurrency} />
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 8: TERMS & AGREEMENTS */}
          {/* ============================================ */}
          <Section title="Terms & Agreements" icon={FileCheck} expanded={sections.agreements} onToggle={() => toggle("agreements")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agreements.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {request[key] ? (
                    <CheckCircle size={16} className="text-[#0D9488] flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-[#374151] dark:text-white">{label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ============================================ */}
          {/* SECTION 9: APPLICATION INFORMATION */}
          {/* ============================================ */}
          <Section title="Application Information" icon={BookOpen} expanded={sections.application} onToggle={() => toggle("application")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</div>
                <div className="mt-1"><StatusBadge status={request.status} /></div>
              </div>
              <InfoRow label="Submitted Date" value={fmt(request.createdAt)} />
              <InfoRow label="Updated Date" value={fmt(request.updatedAt)} />
              <InfoRow label="Reviewed By" value={request.reviewedBy?.name || "Not reviewed yet"} />
              <InfoRow label="Reviewed Date" value={request.reviewedAt ? fmt(request.reviewedAt) : "Not reviewed yet"} />
              <div className="md:col-span-2">
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Admin Notes</div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add admin notes..."
                  rows={3}
                  className="w-full mt-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-[#374151] dark:text-white resize-none outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          </Section>

          {/* ── ✅ FIXED: Action Buttons ── */}
          {request.status === "pending" && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button 
                onClick={handleApprove} 
                disabled={!!actionLoading}
                className="flex-1 min-w-[140px] h-12 rounded-xl bg-[#0D9488] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D9488]/40 hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                {actionLoading === "approve" ? "Approving..." : "Approve"}
              </button>
              <button 
                onClick={handleNeedInfo} 
                disabled={!!actionLoading}
                className="flex-1 min-w-[140px] h-12 rounded-xl bg-[#F59E0B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/40 hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <AlertCircle size={16} /> 
                {actionLoading === "needinfo" ? "Sending..." : "Need Info"}
              </button>
              <button 
                onClick={handleReject} 
                disabled={!!actionLoading}
                className="flex-1 min-w-[140px] h-12 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <XCircle size={16} /> 
                {actionLoading === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          )}

          <button 
            onClick={() => navigate('/admin/provider-requests')} 
            className="w-full h-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[#374151] dark:text-white font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            disabled={!!actionLoading}
          >
            Back to Requests
          </button>
        </div>

        {/* ── Zoom Lightbox ── */}
        {zoom && (
          <div onClick={() => setZoom(null)} className="fixed inset-0 z-50 bg-black/90 dark:bg-black/95 flex items-center justify-center">
            <button onClick={() => setZoom(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition">
              <X size={24} />
            </button>
            <img src={zoom} alt="Document" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderRequestDetails;