import express from 'express';
import {
    getLotSlots,
    createLotSlot,
    getLotSlotById,
    updateLotSlot,
    deleteLotSlot
} from '../controllers/lotSlot.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected and for b2b-vendors
router.use(protect);
router.use(authorize('vendor'));

router.route('/')
    .get(getLotSlots)
    .post(createLotSlot);

router.route('/:id')
    .get(getLotSlotById)
    .put(updateLotSlot)
    .delete(deleteLotSlot);

export default router;
