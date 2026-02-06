import express from 'express';
import { getDashboardSummary } from '../../controllers/admin-controllers/reports.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// Apply auth middleware
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard-summary', getDashboardSummary);

export default router;
