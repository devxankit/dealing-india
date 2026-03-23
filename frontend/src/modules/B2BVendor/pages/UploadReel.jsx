import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiVideo, FiArrowLeft, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import SubscriptionGate from '../components/SubscriptionGate';
import QuotaBanner from '../components/QuotaBanner';

const MAX_VIDEO_MB = 100;
const MAX_DURATION_SECONDS = 60;
const MAX_TITLE = 100;
const MAX_DESC = 500;

export default function UploadReel() {
  const navigate = useNavigate();
  const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    categoryName: '',
    price: '',
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Load B2B categories (used to derive all subcategories for playlist selection)
  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  // Build the flat list of unique subcategory names across all B2B categories
  // and append extra playlist categories for properties.
  const playlistCategories = useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    const names = subs
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean);

    const extra = ['Flat', 'Villa/Row House', 'Commercial Property'];
    const merged = [...names, ...extra];

    const unique = Array.from(
      new Map(
        merged
          .map((name) => (name || '').trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [allCategories]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_VIDEO_MB}MB`);
      return;
    }
    if (!f.type.startsWith('video/')) {
      toast.error('Please select a video file (mp4, mov, webm, etc.)');
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const handlePreviewLoadedMetadata = (event) => {
    const video = event.currentTarget;
    const duration = video.duration;
    if (!Number.isFinite(duration)) return;
    if (duration > MAX_DURATION_SECONDS + 0.25) {
      toast.error(`Video must be ${MAX_DURATION_SECONDS} seconds or shorter`);
      setFile(null);
      setFilePreview(null);
      // Stop playback
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    const categoryName = (form.categoryName || '').trim();
    if (!categoryName) {
      toast.error('Please select a category');
      return;
    }
    if (!file) {
      toast.error('Please select a video file');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('title', form.title.trim().slice(0, MAX_TITLE));
      fd.append('description', (form.description || '').trim().slice(0, MAX_DESC));
      fd.append('categoryName', categoryName);
      fd.append('price', form.price ? Number(form.price) : 0); // Added 'price' to FormData
      if (form.categoryId) fd.append('categoryId', form.categoryId);

      const res = await api.post('/reels', fd);
      if (res.success) {
        toast.success('Reel submitted for moderation. It will go live after admin approval.');
        navigate('/b2b-vendor/reels');
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiVideo className="text-primary-600" />
          Upload Reel
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Short promotional video (e.g. product showcase, property tour). Max {MAX_DURATION_SECONDS} seconds and {MAX_VIDEO_MB}MB. It will be reviewed before going live.
      </p>

      <QuotaBanner action="reels" />

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
        <p className="text-blue-900 font-bold mb-2">Hello vendor !</p>
        <p className="text-blue-800 text-sm mb-4">When uploading a reel of your products on dealingindia, note:</p>
        <ul className="space-y-3 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>Use only the original video and your voice.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">❌</span>
            <span>Videos with any kind of film songs or celebrity voices will not be accepted.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>Due to copyright rules, such videos will be deleted immediately by the admin.</span>
          </li>
        </ul>
      </div>

      <SubscriptionGate action="reels" showLimitInfo={false} fullPage={true}>
        <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Video *</label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-primary-300 transition-colors">
            <input
              type="file"
              accept="video/*"
              onChange={onFileChange}
              className="hidden"
              id="reel-video"
            />
            <label htmlFor="reel-video" className="cursor-pointer block">
              {filePreview ? (
                <video
                  src={filePreview}
                  className="mx-auto max-h-64 rounded-xl bg-black"
                  controls
                  muted
                  playsInline
                  onLoadedMetadata={handlePreviewLoadedMetadata}
                />
              ) : (
                <div className="py-8">
                  <FiUpload className="mx-auto text-4xl text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium">Click to select video</p>
                  <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM, etc. Max {MAX_VIDEO_MB}MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                placeholder="Product name or short catchy title"
                className="w-full px-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={MAX_TITLE}
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/{MAX_TITLE}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 599"
                  className="w-full pl-8 pr-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Briefly describe what this video is about..."
                className="w-full px-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={MAX_DESC}
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/{MAX_DESC}</p>
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={form.categoryName}
            onChange={(e) => {
              const selectedName = e.target.value;

              // Try to map subcategory name back to its parent category id, if any.
              let parentCategoryId = '';
              if (selectedName) {
                for (const cat of allCategories) {
                  const subs = cat.subcategories || [];
                  if (
                    subs.some(
                      (s) =>
                        (typeof s === 'string' ? s : s?.name) === selectedName
                    )
                  ) {
                    parentCategoryId = (cat.id || cat._id || '').toString();
                    break;
                  }
                }
              }

              setForm((f) => ({
                ...f,
                categoryId: parentCategoryId,
                categoryName: selectedName,
              }));
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select category</option>
            {playlistCategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Choose the most specific option (sub-category) to categorize this reel playlist.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !file || !form.title?.trim()}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Uploading…' : 'Submit for review'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/b2b-vendor/reels')}
            className="py-3 px-6 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
      </SubscriptionGate>
    </motion.div>
  );
}
