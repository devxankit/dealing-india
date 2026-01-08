import express from 'express';
import {
    createReel,
    getReels,
    deleteReel,
    updateReel
} from '../controllers/admin-controllers/promotionalReel.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(authenticate, authorize('admin', 'superadmin'));

import { uploadReel } from '../utils/upload.util.js';

router.route('/')
    .get(getReels)
    .post(uploadReel.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]), createReel);

router.route('/:id')
    .put(updateReel)
    .delete(deleteReel);

export default router;
