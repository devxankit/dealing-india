import express from 'express';
// import {
//   getStock,
//   updateStock,
//   getStats,
// } from '../controllers/vendorStock.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Controllers removed - functionality disabled as per user request
const notImplemented = (req, res) => {
  res.status(501).json({ success: false, message: "Feature disabled/removed" });
};

// Routes
router.get('/stats', notImplemented);
router.get('/', notImplemented);
router.patch('/:productId', notImplemented);

export default router;
