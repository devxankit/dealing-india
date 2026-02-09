import express from 'express';
import { trackContactClick, getVendorAnalytics } from '../controllers/vendorAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// Public endpoint - track click (no auth required, anyone can trigger)
router.post('/track-click', trackContactClick);

// Protected endpoint - get analytics (vendor only)
router.get('/', authenticate, authorize('vendor'), getVendorAnalytics);

export default router;
