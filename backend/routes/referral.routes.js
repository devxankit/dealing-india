import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
    getMyReferralSummary,
    transferPointsToVendor,
    validateReferralCodePublic,
} from '../controllers/referral.controller.js';

const router = express.Router();

router.get('/validate/:code', validateReferralCodePublic);
router.get('/me', authenticate, getMyReferralSummary);
router.post('/transfer-to-vendor', authenticate, transferPointsToVendor);

export default router;
