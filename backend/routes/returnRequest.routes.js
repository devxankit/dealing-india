import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    createReturnRequest,
    getUserReturns,
    getReturnEligibility
} from '../controllers/user-controllers/returnRequest.controller.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/', createReturnRequest);
router.get('/', getUserReturns);
router.get('/eligibility/:orderId', getReturnEligibility);

export default router;
