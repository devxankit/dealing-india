/**
 * Subscription Restriction Middleware
 * Enforces subscription rules before allowing listing operations
 */

import subscriptionRulesService from '../services/subscriptionRules.service.js';

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

        const result = await subscriptionRulesService.canCreateProduct(vendorId);

        if (!result.allowed) {
            return res.status(403).json({
                success: false,
                message: result.message,
                subscriptionRequired: true,
                limits: {
                    current: result.currentCount,
                    max: result.limit
                }
            });
        }

        // Attach limit info to request for potential use in controller
        req.subscriptionLimits = {
            products: {
                current: result.currentCount,
                max: result.limit,
                remaining: result.limit === -1 ? -1 : result.limit - result.currentCount
            }
        };

        next();
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
