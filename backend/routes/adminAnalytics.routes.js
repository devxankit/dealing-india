import express from 'express';
import { getB2BVendorAnalytics } from '../controllers/b2bAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/b2b-vendors', asyncHandler(getB2BVendorAnalytics));

export default router;
