import express from 'express';
import { calculateDelivery } from '../controllers/public-controllers/publicDelivery.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.post('/calculate', asyncHandler(calculateDelivery));

export default router;
