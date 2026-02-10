import express from 'express';
import { trackContactClick, getVendorAnalytics } from '../controllers/vendorAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoint - track click (optional auth to identify user)
router.post('/track-click', optionalAuthenticate, trackContactClick);

// Protected endpoint - get analytics (vendor only)
router.get('/', authenticate, authorize('vendor'), getVendorAnalytics);

export default router;
