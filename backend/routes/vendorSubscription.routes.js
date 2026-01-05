import express from 'express';
import VendorSubscriptionController from '../controllers/vendor-controllers/vendorSubscription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { logSubscriptionChange } from '../middleware/subscriptionAudit.middleware.js';

const router = express.Router();

// All vendor routes are protected
router.use(authenticate);
router.use(authorize('vendor'));

router.get('/tiers', VendorSubscriptionController.getTiers);
router.get('/current', VendorSubscriptionController.getCurrentSubscription);
router.get('/billing-history', VendorSubscriptionController.getBillingHistory);
router.post('/initialize', VendorSubscriptionController.initializeSubscription);
router.post('/verify-payment', VendorSubscriptionController.verifyPayment);
router.post('/subscribe', logSubscriptionChange('vendor_subscribe'), VendorSubscriptionController.subscribe);
router.post('/upgrade', logSubscriptionChange('vendor_upgrade'), VendorSubscriptionController.upgrade);
router.put('/renewal', logSubscriptionChange('vendor_renewal_update'), VendorSubscriptionController.updateRenewal);

// Extra reel payment routes
router.get('/check-reel-payment', VendorSubscriptionController.checkReelPayment);
router.post('/initialize-extra-reel-payment', VendorSubscriptionController.initializeExtraReelPayment);
router.post('/verify-extra-reel-payment', VendorSubscriptionController.verifyExtraReelPayment);

export default router;
