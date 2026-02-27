import express from 'express';
import { getAllUsers } from '../controllers/adminUser.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes here are for admin panel user management
router.get('/', authenticate, authorize('admin'), getAllUsers);

export default router;

