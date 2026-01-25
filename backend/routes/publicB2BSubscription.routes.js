import express from 'express';
import AdminB2BSubscriptionPlanController from '../controllers/admin-controllers/b2bSubscriptionPlan.controller.js';

const router = express.Router();

// Get active B2B subscription plans (Public/Vendor accessible)
router.get('/active', AdminB2BSubscriptionPlanController.getActivePlans);

// Get plan by ID
router.get('/:id', AdminB2BSubscriptionPlanController.getPlanById);

export default router;
