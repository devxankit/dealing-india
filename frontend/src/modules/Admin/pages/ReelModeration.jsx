import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo,
  FiCheck,
  FiX,
  FiTrash2,
  FiPlay,
  FiRefreshCw,
  FiFilter,
  FiChevronDown,
  FiExternalLink,
  FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import dayjs from 'dayjs';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', color: 'amber' },
  { key: 'approved', label: 'Approved', color: 'emerald' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
  { key: '', label: 'All', color: 'gray' },
];

// Some backends can send "expired" for reels that are effectively approved.
// We normalize that here so the UI only ever shows: pending, approved, rejected.
const normalizeStatus = (status) => {
  if (status === 'expired') return 'approved';
  return status || '';
};

export default function ReelModeration() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewReel, setPreviewReel] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/admin/reels?${params}`);
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
  }, [statusFilter, page]);

  // Lightweight auto-refresh so new reels and status changes appear without a full page reload
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReels();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [statusFilter, page]);

  const handleApprove = async (reel) => {
    setActionLoading(reel._id);
    try {
      const res = await api.post(`/admin/reels/${reel._id}/approve`);
      if (res.success) {
        toast.success(res.data?.youtubeUploadFailed ? 'Reel approved (YouTube upload failed — video will play from platform)' : 'Reel approved and published to YouTube');
        setPreviewReel(null);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Approve failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    setActionLoading(showRejectModal._id);
    try {
      await api.post(`/admin/reels/${showRejectModal._id}/reject`, { reason: rejectReason });
      toast.success('Reel rejected');
      setShowRejectModal(null);
      setRejectReason('');
      setPreviewReel(null);
      fetchReels();
    } catch (err) {
      toast.error(err.message || 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (reel) => {
    if (!window.confirm('Permanently delete this reel?')) return;
    setActionLoading(reel._id);
    try {
      await api.delete(`/admin/reels/${reel._id}`);
      toast.success('Reel deleted');
      setPreviewReel(null);
      setShowRejectModal(null);
      fetchReels();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pages = Math.ceil(total / 12) || 1;

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
            Reel Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve short videos before they go live.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchReels()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key || 'all'}
            type="button"
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[9/16] max-h-[280px]" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <FiVideo className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No reels found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'pending' ? 'Vendors and users can upload reels for your review.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reels.map((reel) => (
              <motion.div
                key={reel._id}
                layout
                className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[28/16] max-h-[280px] bg-gray-900 relative group overflow-hidden">
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(reel)}
                      className="p-3 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-colors"
                      title="Preview"
                    >
                      <FiPlay className="text-lg" />
                    </button>
                    {reel.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(reel)}
                          disabled={actionLoading === reel._id}
                          className="p-3 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                          title="Approve"
                        >
                          {actionLoading === reel._id ? (
                            <FiRefreshCw className="text-lg animate-spin" />
                          ) : (
                            <FiCheck className="text-lg" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(reel)}
                          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
                          title="Reject"
                        >
                          <FiX className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(reel)}
                          disabled={actionLoading === reel._id}
                          className="p-3 rounded-full bg-gray-600 text-white hover:bg-gray-700"
                          title="Delete"
                        >
                          <FiTrash2 className="text-lg" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        normalizeStatus(reel.status) === 'pending'
                          ? 'bg-amber-500/90 text-white'
                          : normalizeStatus(reel.status) === 'approved'
                          ? 'bg-emerald-500/90 text-white'
                          : normalizeStatus(reel.status) === 'rejected'
                          ? 'bg-red-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                      }`}
                    >
                      {normalizeStatus(reel.status)}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{reel.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{reel.categoryName} · {reel.uploaderName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{dayjs(reel.createdAt).format('MMM D, YYYY HH:mm')}</p>
                  {/* Always show "View on YouTube" when reel is on YouTube; never remove it */}
                  {(reel.youtubeVideoId || (normalizeStatus(reel.status) === 'approved' && reel.youtubeUploadFailed)) && (
                    <div className="mt-2">
                      {reel.youtubeVideoId ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${reel.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          <FiExternalLink className="flex-shrink-0" /> View on YouTube
                        </a>
                      ) : (
                        <p className="text-xs text-amber-600 flex items-center gap-1" title={reel.youtubeUploadError || ''}>
                          <FiAlertCircle className="flex-shrink-0" /> YouTube upload failed
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(reel)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Preview
                    </button>
                    {reel.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(reel)}
                          disabled={actionLoading === reel._id}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(reel)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(reel)}
                          disabled={actionLoading === reel._id}
                          className="text-xs font-medium text-gray-600 hover:text-gray-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {previewReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewReel(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full bg-black">
                {previewReel.videoUrl && (
                  <video
                    src={previewReel.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">{previewReel.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{previewReel.description || '—'}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {previewReel.categoryName} · {previewReel.uploaderName} ·{' '}
                  {dayjs(previewReel.createdAt).format('MMM D, YYYY')}
                </p>
                {/* Always show "View on YouTube" when reel is on YouTube; never remove it */}
                {(previewReel.youtubeVideoId || (normalizeStatus(previewReel.status) === 'approved' && previewReel.youtubeUploadFailed)) && (
                  <div className="mt-2">
                    {previewReel.youtubeVideoId ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${previewReel.youtubeVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        <FiExternalLink /> View on YouTube
                      </a>
                    ) : (
                      <p className="text-sm text-amber-600 flex items-center gap-2" title={previewReel.youtubeUploadError || ''}>
                        <FiAlertCircle /> YouTube upload failed — video plays from platform for 24h
                      </p>
                    )}
                  </div>
                )}
                {previewReel.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleApprove(previewReel)}
                      disabled={actionLoading === previewReel._id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === previewReel._id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewReel(null); setShowRejectModal(previewReel); }}
                      className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 font-medium hover:bg-red-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(previewReel)}
                      disabled={actionLoading === previewReel._id}
                      className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewReel(null)}
                  className="w-full mt-2 py-2 text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-gray-900">Reject reel</h3>
              <p className="text-sm text-gray-500 mt-1">{showRejectModal.title}</p>
              <label className="block text-sm font-medium text-gray-700 mt-4">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Poor quality, off-topic..."
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                rows={3}
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading === showRejectModal._id}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
