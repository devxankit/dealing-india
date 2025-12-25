import express from 'express';
import {
  getSliders,
  getSlider,
  createSliderHandler,
  updateSliderHandler,
  deleteSliderHandler,
} from '../controllers/admin-controllers/sliders.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Sliders routes
router.get('/', asyncHandler(getSliders));
router.get('/:id', asyncHandler(getSlider));
router.post('/', upload.single('image'), asyncHandler(createSliderHandler));
router.put('/:id', upload.single('image'), asyncHandler(updateSliderHandler));
router.delete('/:id', asyncHandler(deleteSliderHandler));

export default router;

