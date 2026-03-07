import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiVideo, FiArrowLeft, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const MAX_VIDEO_MB = 100;
const MAX_TITLE = 100;
const MAX_DESC = 500;

export default function UploadReel() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    categoryName: '',
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/public/b2b-categories');
        if (res?.data && Array.isArray(res.data)) {
          setCategories(res.data);
        } else if (res?.data?.categories) {
          setCategories(res.data.categories);
        }
      } catch (_) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    const cat = categories.find((c) => c.id === form.categoryId || c._id === form.categoryId);
    const categoryName = form.categoryName?.trim() || (cat?.name ?? '');
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

      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
        <FiVideo className="text-primary-600" />
        Upload Reel
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Short promotional video (e.g. product showcase, property tour). Max {MAX_VIDEO_MB}MB. It will be reviewed before going live.
      </p>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Saree collection preview"
            maxLength={MAX_TITLE}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">{form.title.length}/{MAX_TITLE}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description..."
            maxLength={MAX_DESC}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">{form.description.length}/{MAX_DESC}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
          <select
            value={form.categoryId}
            onChange={(e) => {
              const id = e.target.value;
              const cat = categories.find((c) => (c.id || c._id) === id);
              setForm((f) => ({
                ...f,
                categoryId: id,
                categoryName: cat?.name || '',
              }));
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id || c._id} value={c.id || c._id}>
                {c.name}
              </option>
            ))}
          </select>
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
    </motion.div>
  );
}
