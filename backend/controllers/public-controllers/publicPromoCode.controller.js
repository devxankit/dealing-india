
import { validatePromoCodeLogic, getActivePromoCodesForVendors } from '../../services/promoCode.service.js';

/**
 * Validate promo code
 * POST /api/public/promocodes/validate
 */
export const validatePromoCode = async (req, res, next) => {
    try {
        const { code, cartTotal, cartItems } = req.body;
        const userId = req.user ? req.user.userId : null;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Promo code is required',
            });
        }

        if (cartTotal === undefined || !cartItems || !Array.isArray(cartItems)) {
            return res.status(400).json({
                success: false,
                message: 'Cart details are required',
            });
        }

        const result = await validatePromoCodeLogic(code, parseFloat(cartTotal), cartItems, userId);

        res.status(200).json({
            success: true,
            message: 'Promo code applied successfully',
            data: result,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

/**
 * Get available promo codes for users
 * GET /api/public/promocodes/available
 */
export const getAvailableCoupons = async (req, res, next) => {
    try {
        const coupons = await getActivePromoCodesForVendors();
        console.log('Available coupons for user:', JSON.stringify(coupons, null, 2));
        res.status(200).json({
            success: true,
            message: 'Available coupons retrieved successfully',
            data: { coupons },
        });
    } catch (error) {
        next(error);
    }
};
