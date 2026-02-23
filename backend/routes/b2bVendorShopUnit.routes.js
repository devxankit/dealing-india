import express from 'express';
import { getMyUnit, createOrUpdateUnit } from '../controllers/shopUnit.controller.js';
import { protectVendor } from '../middleware/auth.middleware.js';
import { checkShopListingAccess } from '../middleware/shopListingAccess.middleware.js';

const router = express.Router();

router.use(protectVendor);

// Apply shop listing access check to all shop unit routes
router.get('/', checkShopListingAccess, getMyUnit);
router.post('/', checkShopListingAccess, createOrUpdateUnit);

export default router;
