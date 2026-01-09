import express from 'express';
import { setTimeWarpOffset, resetTimeWarp, getTimeWarpOffset } from '../utils/timeWarp.util.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Only allow in development mode or if a specific dev flag is enabled
// For this task, we will allow it but keep it hidden from standard menus
router.post('/warp', asyncHandler(async (req, res) => {
    const { days } = req.body;

    if (typeof days !== 'number') {
        return res.status(400).json({ success: false, message: 'Days must be a number' });
    }

    setTimeWarpOffset(days);

    res.json({
        success: true,
        message: `Time warped by ${days} days`,
        currentOffset: getTimeWarpOffset()
    });
}));

router.post('/reset', asyncHandler(async (req, res) => {
    resetTimeWarp();
    res.json({
        success: true,
        message: 'Time reset to actual time',
        currentOffset: 0
    });
}));

router.get('/status', (req, res) => {
    res.json({
        success: true,
        currentOffset: getTimeWarpOffset(),
        isWarped: getTimeWarpOffset() !== 0
    });
});

export default router;
