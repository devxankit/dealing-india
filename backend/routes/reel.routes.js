import express from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { uploadVideo } from '../utils/upload.util.js';
import {
  uploadReel,
  getMyReels,
  getFeed,
  likeReel,
  unlikeReel,
  getComments,
  addComment,
  getPlaylistByCategory,
  trackView,
} from '../controllers/reel.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('vendor', 'user'),
  uploadVideo.single('video'),
  asyncHandler(uploadReel)
);
router.get('/my', authenticate, authorize('vendor', 'user'), asyncHandler(getMyReels));

router.get('/feed', optionalAuthenticate, asyncHandler(getFeed));
router.get('/playlist/:categoryName', asyncHandler(getPlaylistByCategory));

router.post('/:id/like', authenticate, authorize('user', 'vendor'), asyncHandler(likeReel));
router.delete('/:id/like', authenticate, authorize('user', 'vendor'), asyncHandler(unlikeReel));
router.get('/:id/comments', asyncHandler(getComments));
router.post('/:id/comments', authenticate, authorize('user', 'vendor'), asyncHandler(addComment));
router.post('/:id/view', optionalAuthenticate, asyncHandler(trackView));

export default router;
