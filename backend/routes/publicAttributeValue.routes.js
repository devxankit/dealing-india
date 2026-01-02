import express from 'express';
import {
    getAll,
    getById,
} from '../controllers/vendor-controllers/attributeValue.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public attribute value routes (no authentication required)
router.get('/', asyncHandler(getAll));
router.get('/:id', asyncHandler(getById));

export default router;
