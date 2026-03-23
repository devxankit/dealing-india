import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiVideo, FiPlus, FiClock, FiCheck, FiX, FiPlay, FiTrash2, FiMusic, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
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
  const [replacingReel, setReplacingReel] = useState(null);
  const [approvedMusic, setApprovedMusic] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [replacingId, setReplacingId] = useState(null);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reels/my?page=${page}&limit=12`);
      if (res.success) {
        setReels(res.data.reels || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      const res = await api.delete(`/reels/${id}`);
      if (res.success) {
        toast.success('Reel deleted successfully');
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const fetchMusic = async () => {
    setMusicLoading(true);
    try {
      const res = await api.get('/music/approved');
      if (res.success) setApprovedMusic(res.data.music || []);
    } catch (err) {
      toast.error('Failed to load music library');
    } finally {
      setMusicLoading(false);
    }
  };

  const handleReplaceSong = async (musicId) => {
    if (!replacingReel || !musicId) return;
    setReplacingId(musicId);
    try {
      const res = await api.post(`/reels/${replacingReel._id}/replace-song`, { musicId });
      if (res.success) {
        toast.success(res.message);
        setReplacingReel(null);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Replacement failed');
    } finally {
      setReplacingId(null);
    }
  };

  useEffect(() => {
    if (replacingReel) fetchMusic();
  }, [replacingReel]);


  useEffect(() => {
    fetchReels();
  }, [page]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiVideo className="text-primary-600" />
            My Reels
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your short videos and track their performance.</p>
        </div>
        <button
          onClick={() => navigate('/b2b-vendor/reels/upload')}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95"
        >
          <FiPlus />
          Upload Reel
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl py-24 text-center">
          <FiVideo className="mx-auto text-5xl text-gray-300 mb-4" />
          <h3 className="text-gray-900 font-bold">No reels yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Start sharing your products through short videos.</p>
          <button
            onClick={() => navigate('/b2b-vendor/reels/upload')}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Upload your first reel
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reels.map((reel) => (
              <div key={reel._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                <div className="aspect-[9/16] bg-gray-900 relative">
                  <video
                    src={reel.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setPreviewReel(reel)}
                      className="p-3 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-colors"
                    >
                      <FiPlay fill="currentColor" />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      (reel.status === 'approved' || reel.status === 'expired') ? 'bg-emerald-500 text-white' :
                      reel.status === 'pending' ? 'bg-amber-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                      {reel.status === 'expired' ? 'approved' : reel.status}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{reel.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{reel.categoryName} · {dayjs(reel.createdAt).format('MMM D, YYYY')}{reel.price > 0 && ` · ₹${reel.price}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(reel._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete reel"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                  {reel.status === 'rejected' && reel.rejectReason && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 line-clamp-2" title={reel.rejectReason}>
                      <span className="font-semibold">Reason:</span> {reel.rejectReason}
                    </div>
                  )}

                  {reel.isCopyrighted && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <div className="flex items-center gap-2 text-orange-700 mb-2">
                        <FiAlertTriangle className="shrink-0" />
                        <span className="text-xs font-bold">Copyright Issue</span>
                      </div>
                      <button
                        onClick={() => setReplacingReel(reel)}
                        className="w-full py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiMusic /> Replace Song
                      </button>
                    </div>
                  )}
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
        </>
      )}

      {/* Fullscreen preview modal */}
      <AnimatePresence>
        {previewReel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={() => setPreviewReel(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden"
            >
              <button
                onClick={() => setPreviewReel(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
              >
                <FiX size={20} />
              </button>
              <video
                src={previewReel.videoUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Music Selection Modal */}
      <AnimatePresence>
        {replacingReel && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={() => !replacingId && setReplacingReel(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Choose Approved Music</h2>
                  <p className="text-xs text-gray-500">Pick a non-copyrighted song for "{replacingReel.title}"</p>
                </div>
                <button onClick={() => setReplacingReel(null)} disabled={replacingId !== null}>
                  <FiX className="text-xl text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                {musicLoading ? (
                  <div className="py-12 flex justify-center">
                    <FiRefreshCw className="animate-spin text-3xl text-primary-600" />
                  </div>
                ) : approvedMusic.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FiMusic className="mx-auto text-4xl mb-2 opacity-20" />
                    No approved music available. Please contact admin.
                  </div>
                ) : (
                  approvedMusic.map((song) => (
                    <div
                      key={song._id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                        <FiMusic />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{song.title}</h4>
                        <p className="text-xs text-gray-500">{song.artist} • {song.genre}</p>
                      </div>
                      <button
                        onClick={() => handleReplaceSong(song._id)}
                        disabled={replacingId !== null}
                        className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 disabled:opacity-50 transition-opacity"
                      >
                        {replacingId === song._id ? 'Applying...' : 'Select'}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50 text-[10px] text-gray-400 text-center border-t">
                Applying a new song will submit the reel for re-approval by admin.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
