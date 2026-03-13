import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiVideo, FiPlus, FiClock, FiCheck, FiX, FiPlay } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import dayjs from 'dayjs';

export default function Reels() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewReel, setPreviewReel] = useState(null);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reels/my?page=${page}&limit=12`);
      if (res.success) {
        setReels(res.data.reels || []);
        setTotal(res.pagination?.total ?? 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load reels');
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, [page]);

  const statusBadge = (status) => {
    const normalized = status === 'expired' ? 'approved' : status;
    const map = {
      pending: { label: 'Pending', class: 'bg-amber-100 text-amber-800' },
      approved: { label: 'Approved', class: 'bg-emerald-100 text-emerald-800' },
      rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800' },
    };
    const s = map[normalized] || map.pending;
    return <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.class}`}>{s.label}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiVideo className="text-primary-600" />
            My Reels
          </h1>
          <p className="text-sm text-gray-500 mt-1">Short videos for products or properties. They go live after admin approval.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/b2b-vendor/reels/upload')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
        >
          <FiPlus className="text-lg" />
          Upload Reel
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[9/16] max-h-[260px]" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <FiVideo className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No reels yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload a short video to promote your products or properties.</p>
          <button
            type="button"
            onClick={() => navigate('/b2b-vendor/reels/upload')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
          >
            <FiPlus /> Upload Reel
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reels.map((reel) => (
              <div
                key={reel._id}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="aspect-[28/16] max-h-[210px] bg-gray-900 relative overflow-hidden group">
                  {reel.videoUrl ? (
                    <video
                      src={reel.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      poster={reel.thumbnailUrl}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <FiVideo className="text-4xl" />
                    </div>
                  )}
                  {/* Hover overlay with preview button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(reel)}
                      className="p-3 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow-lg"
                      title="Preview reel"
                    >
                      <FiPlay className="text-lg" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    {statusBadge(reel.status)}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 truncate">{reel.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{reel.categoryName} · {dayjs(reel.createdAt).format('MMM D, YYYY')}</p>
                </div>
              </div>
            ))}
          </div>
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {Math.ceil(total / 12)}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 12)}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          {/* Fullscreen preview modal (vendor-side only, no moderation actions) */}
          <AnimatePresence>
            {previewReel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black z-40"
                  onClick={() => setPreviewReel(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                >
                  <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(null)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black"
                      aria-label="Close preview"
                    >
                      <FiX className="text-lg" />
                    </button>
                    {previewReel?.videoUrl ? (
                      <video
                        src={previewReel.videoUrl}
                        className="w-full h-full object-contain bg-black"
                        controls
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiVideo className="text-4xl" />
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
