import express from 'express';
import {
  getAllB2BCategories,
} from '../services/b2bCategoryManagement.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Public B2B category routes (no authentication required for reading)
router.get('/', asyncHandler(async (req, res) => {
  try {
    const categories = await getAllB2BCategories();

    res.status(200).json({
      success: true,
      message: 'B2B categories retrieved successfully',
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve B2B categories',
    });
  }
}));

export default router;
