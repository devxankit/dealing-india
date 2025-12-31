import express from 'express';
import VendorSubscriptionController from '../controllers/vendor-controllers/vendorSubscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { logSubscriptionChange } from '../middleware/subscriptionAudit.middleware.js';

const router = express.Router();

// All vendor routes are protected
router.use(authenticate);
router.use(authorize('vendor'));

router.get('/current', VendorSubscriptionController.getCurrentSubscription);
router.post('/subscribe', logSubscriptionChange('vendor_subscribe'), VendorSubscriptionController.subscribe);
router.post('/upgrade', logSubscriptionChange('vendor_upgrade'), VendorSubscriptionController.upgrade);

export default router;
