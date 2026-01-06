import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import {
  getCampaigns,
  getCampaign,
} from '../controllers/public-controllers/publicCampaigns.controller.js';

const router = express.Router();

// Public campaigns routes (no authentication required)
router.get('/', asyncHandler(getCampaigns));
router.get('/:id', asyncHandler(getCampaign));

export default router;


















