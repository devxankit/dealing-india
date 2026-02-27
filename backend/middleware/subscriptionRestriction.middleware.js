import subscriptionRulesService from '../services/subscriptionRules.service.js';
import ShopUnit from '../models/ShopUnit.model.js';

/**
 * Middleware to check if vendor has a shop listing
 * Must be used after authentication middleware
 */
export const requireShopListing = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const shop = await ShopUnit.findOne({ vendorId }).lean();

        if (!shop) {
            return res.status(403).json({
                success: false,
                message: 'Please complete your Shop Listing before adding any items.',
                shopListingRequired: true
            });
        }

        req.shop = shop;
        next();
    } catch (error) {
        console.error('Error in requireShopListing middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create products
 * Must be used after authentication middleware
 */
export const checkProductCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        // TEMPORARY: Subscription check bypassed - allow all vendors to add products without subscription
        const result = await subscriptionRulesService.canCreateProduct(vendorId);
        req.subscriptionLimits = {
            products: {
                current: result.currentCount ?? 0,
                max: result.limit ?? -1,
                remaining: result.limit === -1 ? -1 : Math.max(0, (result.limit ?? 0) - (result.currentCount ?? 0))
            }
        };
        return next();
    } catch (error) {
        console.error('Error in checkProductCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create lot/slot listings
 * Must be used after authentication middleware
 */
export const checkLotSlotCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canCreateLotSlot(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: true,
                requiresDiamondPlan: true
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkLotSlotCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor can create property listings
 * Also attaches maxImages limit to the request
 * Must be used after authentication middleware
 */
export const checkPropertyCreation = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.canCreateProperty(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: true
            });
        }

        // Attach image limit to request for use in controller
        req.subscriptionLimits = {
            property: {
                maxImages: result.maxImages
            }
        };

        next();
    } catch (error) {
        console.error('Error in checkPropertyCreation middleware:', error);
        next(error);
    }
};

/**
 * Middleware to check if vendor has any active subscription
 * Generic check - doesn't validate specific feature access
 */
export const requireActiveSubscription = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.userDoc?._id;

        if (!vendorId) {
            return res.status(401).json({
                success: false,
                message: 'Vendor authentication required'
            });
        }

        const result = await subscriptionRulesService.checkHasActiveSubscription(vendorId);

        if (!result.hasSubscription) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: true
            });
        }

        // Attach subscription to request
        req.subscription = result.subscription;
        next();
    } catch (error) {
        console.error('Error in requireActiveSubscription middleware:', error);
        next(error);
    }
};
