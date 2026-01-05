import { calculateDeliveryCharge } from '../../services/delivery.service.js';

/**
 * Calculate delivery charge
 * POST /api/public/delivery/calculate
 */
export const calculateDelivery = async (req, res, next) => {
    try {
        const { items, address } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required',
            });
        }

        const result = await calculateDeliveryCharge(items, address);

        res.status(200).json({
            success: true,
            message: 'Delivery calculated',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
