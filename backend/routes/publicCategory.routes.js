import express from 'express';
import {
    getCategories,
    getCategory,
} from '../controllers/admin-controllers/categoryManagement.controller.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public category routes (no authentication required)
router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategory));

export default router;
