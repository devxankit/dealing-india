import express from 'express';
import { protectAdmin } from '../middleware/auth.middleware.js';
import {
    getAllReturns,
    updateAdminReturnStatus,
    processRefund,
    getReturnPolicy,
    updateReturnPolicy,
    forceDeleteReturn
} from '../controllers/admin-controllers/adminReturn.controller.js';

const router = express.Router();

router.use(protectAdmin); // All routes require admin authentication

router.get('/', getAllReturns);
router.put('/:id/status', updateAdminReturnStatus);
router.put('/:id/refund', processRefund);
router.delete('/force-delete/:orderId', forceDeleteReturn);

router.get('/policy', getReturnPolicy);
router.put('/policy', updateReturnPolicy);

export default router;
