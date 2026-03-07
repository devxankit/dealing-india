import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiMessageCircle, FiChevronUp, FiChevronDown, FiVideo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

export default function ReelFeed() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const containerRef = useRef(null);

  const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await api.get(`/reels/feed?page=${pageNum}&limit=10`);
      if (res.success && res.data?.reels?.length) {
        setReels((prev) => (append ? [...prev, ...res.data.reels] : res.data.reels));
        if (!append) setCurrentIndex(0);
      } else if (!append) {
        setReels([]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load reels');
      if (!append) setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    setPage((p) => {
      fetchFeed(p + 1, true);
      return p + 1;
    });
  }, [fetchFeed]);

  const fetchComments = async (reelId) => {
    if (comments[reelId] !== undefined) return;
    try {
      const res = await api.get(`/reels/${reelId}/comments`);
      if (res.success) setComments((c) => ({ ...c, [reelId]: res.data?.comments || [] }));
    } catch (_) {}
  };

  const toggleLike = async (reel) => {
    try {
      if (reel.userLiked) {
        await api.delete(`/reels/${reel._id}/like`);
        setReels((prev) =>
          prev.map((r) =>
            r._id === reel._id
              ? { ...r, userLiked: false, likeCount: Math.max(0, (r.likeCount || 0) - 1) }
              : r
          )
        );
      } else {
        await api.post(`/reels/${reel._id}/like`);
        setReels((prev) =>
          prev.map((r) =>
            r._id === reel._id
              ? { ...r, userLiked: true, likeCount: (r.likeCount || 0) + 1 }
              : r
          )
        );
      }
    } catch (err) {
      toast.error(err.message || 'Could not update like');
    }
  };

  const submitComment = async (reelId) => {
    const text = newComment.trim();
    if (!text) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/reels/${reelId}/comments`, { text });
      if (res.success && res.data?.comment) {
        setComments((c) => ({ ...c, [reelId]: [...(c[reelId] || []), res.data.comment] }));
        setReels((prev) =>
          prev.map((r) => (r._id === reelId ? { ...r, commentCount: (r.commentCount || 0) + 1 } : r))
        );
        setNewComment('');
      }
    } catch (err) {
      toast.error(err.message || 'Could not post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const currentReel = reels[currentIndex];
  const hasNext = currentIndex < reels.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    setShowComments(null);
  }, [currentIndex]);

  if (loading && reels.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900">
        <B2BHeader />
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <FiVideo className="text-6xl text-gray-500 mb-4" />
          <p className="text-gray-400 font-medium">No reels right now</p>
          <p className="text-sm text-gray-500 mt-1">Check back later for short videos from sellers.</p>
          <button
            type="button"
            onClick={() => navigate('/b2b/landing')}
            className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium"
          >
            Back to home
          </button>
        </div>
        <B2BBottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <B2BHeader hideSearch />
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {currentReel && (
            <motion.div
              key={currentReel._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex-1 flex items-center justify-center bg-black min-h-0">
                {currentReel.youtubeVideoId ? (
                  <iframe
                    title={currentReel.title}
                    src={`https://www.youtube.com/embed/${currentReel.youtubeVideoId}?autoplay=1`}
                    className="w-full h-full max-h-full object-contain"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : currentReel.videoUrl ? (
                  <video
                    src={currentReel.videoUrl}
                    className="w-full h-full max-h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    muted={false}
                  />
                ) : (
                  <div className="text-gray-500 flex flex-col items-center gap-2">
                    <FiVideo className="text-5xl" />
                    <span>Video unavailable</span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-semibold truncate">{currentReel.title}</p>
                <p className="text-gray-300 text-sm truncate">{currentReel.uploaderName} · {currentReel.categoryName}</p>
              </div>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                <button
                  type="button"
                  onClick={() => toggleLike(currentReel)}
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <FiHeart
                    className={`text-3xl ${currentReel.userLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  <span className="text-xs">{currentReel.likeCount ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowComments(showComments === currentReel._id ? null : currentReel._id);
                    if (showComments !== currentReel._id) fetchComments(currentReel._id);
                  }}
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <FiMessageCircle className="text-3xl" />
                  <span className="text-xs">{currentReel.commentCount ?? 0}</span>
                </button>
              </div>

              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={!hasPrev}
                  className="p-2 rounded-full bg-white/20 text-white disabled:opacity-30"
                >
                  <FiChevronUp className="text-xl" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hasNext) setCurrentIndex((i) => i + 1);
                    else loadMore();
                  }}
                  className="p-2 rounded-full bg-white/20 text-white disabled:opacity-30"
                >
                  <FiChevronDown className="text-xl" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showComments === currentReel?._id && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-0 z-50 bg-gray-900 flex flex-col"
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-white">Comments</h3>
              <button
                type="button"
                onClick={() => setShowComments(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(comments[currentReel?._id] || []).map((c) => (
                <div key={c._id} className="text-sm">
                  <span className="font-medium text-white">{c.userName}</span>
                  <span className="text-gray-400 ml-2">{c.text}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white placeholder-gray-500 border border-gray-700"
                onKeyDown={(e) => e.key === 'Enter' && submitComment(currentReel._id)}
              />
              <button
                type="button"
                onClick={() => submitComment(currentReel._id)}
                disabled={submittingComment || !newComment.trim()}
                className="px-4 py-3 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <B2BBottomNav />
    </div>
  );
}
