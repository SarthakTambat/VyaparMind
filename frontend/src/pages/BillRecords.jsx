import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "lib/api";
import {
  Camera, Upload, Trash, X, FileImage, Plus, Warning,
  MagnifyingGlass, Note, CalendarBlank,
} from "@phosphor-icons/react";

export default function BillRecords() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null); // for preview
  const [deleteTarget, setDeleteTarget] = useState(null); // for delete confirm
  const [note, setNote] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchBills = useCallback(async () => {
    try {
      const { data } = await api.get("/api/bills");
      setBills(data.bills || []);
    } catch (e) {
      console.error("Failed to fetch bills:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Upload handler
  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("note", note);
      await api.post("/api/bills", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNote("");
      await fetchBills();
    } catch (e) {
      alert(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // File picker
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  // Camera capture (mobile-friendly)
  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  // Desktop webcam capture
  const startWebcam = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or not available");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `bill_${Date.now()}.jpg`, { type: "image/jpeg" });
        handleUpload(file);
      }
      stopWebcam();
    }, "image/jpeg", 0.85);
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Delete with confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/bills/${deleteTarget.id}`);
      setBills((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      if (selectedBill?.id === deleteTarget.id) setSelectedBill(null);
    } catch (e) {
      alert("Delete failed");
    }
    setDeleteTarget(null);
  };

  // Get image URL with auth header (for display)
  const getBillImageUrl = (bill) => {
    return `${api.defaults.baseURL}/api/bills/${bill.id}/image`;
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Bill Records
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture and store your bills safely. Access them anytime.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Camera button (uses native capture on mobile) */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            style={{ borderRadius: 6 }}
            disabled={uploading}
          >
            <Camera weight="bold" size={18} />
            <span className="hidden sm:inline">Capture</span>
          </button>
          {/* Upload from gallery */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00A884] text-white text-sm font-medium hover:bg-[#009974] transition-colors"
            style={{ borderRadius: 6 }}
            disabled={uploading}
          >
            <Upload weight="bold" size={18} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Note input */}
      <div className="mb-5 flex items-center gap-3">
        <Note weight="duotone" size={20} className="text-slate-400" />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for next upload (optional)..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 focus:border-[#00A884]"
        />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Upload indicator */}
      {uploading && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-blue-700 font-medium">Uploading bill...</span>
        </div>
      )}

      {/* Bills Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileImage weight="duotone" size={64} className="mb-4 opacity-50" />
          <p className="text-lg font-medium text-slate-500">No bills saved yet</p>
          <p className="text-sm mt-1">Click Capture or Upload to save your first bill</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              imageUrl={getBillImageUrl(bill)}
              onView={() => setSelectedBill(bill)}
              onDelete={() => setDeleteTarget(bill)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="relative bg-white rounded-xl max-w-3xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBill(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
            >
              <X weight="bold" size={16} />
            </button>
            <AuthImage
              src={getBillImageUrl(selectedBill)}
              alt={selectedBill.original_name}
              className="w-full max-h-[70vh] object-contain rounded-t-xl"
            />
            <div className="p-4 border-t">
              <p className="text-sm font-semibold text-slate-800">{selectedBill.original_name}</p>
              {selectedBill.note && (
                <p className="text-sm text-slate-500 mt-1">{selectedBill.note}</p>
              )}
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <CalendarBlank size={12} /> {formatDate(selectedBill.created_at)}
              </p>
              <button
                onClick={() => { setSelectedBill(null); setDeleteTarget(selectedBill); }}
                className="mt-3 flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <Trash size={16} /> Delete this bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Warning weight="fill" size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Permanently?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this bill permanently? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webcam Modal (for desktop) */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-[4/3] object-cover bg-black"
              />
            </div>
            <div className="flex gap-3 p-4 justify-center">
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]"
              >
                <Camera weight="bold" size={18} className="inline mr-2" />
                Capture
              </button>
              <button
                onClick={stopWebcam}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component to load image with auth header
function AuthImage({ src, alt, className }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(src.replace(api.defaults.baseURL, ""), {
          responseType: "blob",
        });
        if (!cancelled) {
          const url = URL.createObjectURL(res.data);
          setImgSrc(url);
        }
      } catch (e) {
        console.error("Failed to load image:", e);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (imgSrc) URL.revokeObjectURL(imgSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!imgSrc) {
    return (
      <div className={`${className} bg-slate-100 flex items-center justify-center`}>
        <div className="animate-pulse w-8 h-8 bg-slate-200 rounded"></div>
      </div>
    );
  }
  return <img src={imgSrc} alt={alt} className={className} />;
}

// Individual Bill Card
function BillCard({ bill, imageUrl, onView, onDelete, formatDate }) {
  return (
    <div
      className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
      onClick={onView}
    >
      <div className="aspect-[3/4] overflow-hidden bg-slate-50">
        <AuthImage
          src={imageUrl}
          alt={bill.original_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-slate-700 truncate">
          {bill.note || bill.original_name}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(bill.created_at)}</p>
      </div>
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="Delete"
      >
        <Trash weight="bold" size={13} />
      </button>
    </div>
  );
}
