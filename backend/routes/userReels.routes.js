import express from 'express';
import { getReels } from '../controllers/user-controllers/userReels.controller.js';

const router = express.Router();

// Public route - no authentication required for viewing reels
router.get('/', getReels);

export default router;

