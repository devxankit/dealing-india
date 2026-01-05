import express from 'express';
import {
    getDeliveryRules,
    getDeliveryRuleById,
    createDeliveryRule,
    updateDeliveryRule,
    deleteDeliveryRule
} from '../controllers/admin-controllers/adminDelivery.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectAdmin);

router.route('/')
    .get(getDeliveryRules)
    .post(createDeliveryRule);

router.route('/:id')
    .get(getDeliveryRuleById)
    .put(updateDeliveryRule)
    .delete(deleteDeliveryRule);

export default router;
