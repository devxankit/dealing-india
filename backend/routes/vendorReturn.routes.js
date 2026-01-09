import express from 'express';
import { protectVendor } from '../middleware/auth.middleware.js';
import {
    getVendorReturns,
    updateReturnStatus,
    markReturnReceived
} from '../controllers/vendor-controllers/vendorReturn.controller.js';

const router = express.Router();

router.use(protectVendor); // All routes require vendor authentication

router.get('/', getVendorReturns);
router.put('/:id/status', updateReturnStatus);
router.put('/:id/received', markReturnReceived); // Mark return as received and process refund

export default router;
