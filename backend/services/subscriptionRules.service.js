/**
 * Subscription Rules Service
 * Centralized business logic for subscription-based restrictions
 * 
 * BUSINESS RULES:
 * - All plans valid for 1 year
 * - Without active subscription: No listings allowed
 * 
 * TEXTILE VENDOR PLANS:
 * - BASIC: Max 50 products, NO lot/slot
 * - SILVER: Max 100 products, NO lot/slot  
 * - DIAMOND: Unlimited products, Lot/Slot allowed
 * 
 * PROPERTY VENDOR PLANS:
 * - DEVELOPER PREMIUM: Unlimited properties, Max 50 images per property
 * - BROKER PREMIUM: Unlimited properties, Max 5 images per property
 */

import Vendor from '../models/Vendor.model.js';
import VendorSubscription from '../models/VendorSubscription.model.js';
import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';

// Plan type constants
export const PLAN_TYPES = {
    BASIC: 'basic',
    SILVER: 'silver',
    DIAMOND: 'diamond',
    PREMIUM: 'premium'
};

// Business type constants
export const BUSINESS_TYPES = {
    TEXTILE: 'textile',
    DEVELOPER: 'developer',
    BROKER: 'property-broker',
    PROPERTY_BROKER: 'property-broker'
};

// Plan limits configuration
const PLAN_LIMITS = {
    [PLAN_TYPES.BASIC]: {
        maxProducts: 50,
        allowLotSlot: false,
        maxProperties: 0,
        maxImagesPerProperty: 0
    },
    [PLAN_TYPES.SILVER]: {
        maxProducts: 100,
        allowLotSlot: false,
        maxProperties: 0,
        maxImagesPerProperty: 0
    },
    [PLAN_TYPES.DIAMOND]: {
        maxProducts: -1, // Unlimited
        allowLotSlot: true,
        maxProperties: 0,
        maxImagesPerProperty: 0
    },
    [PLAN_TYPES.PREMIUM]: {
        maxProducts: 0,
        allowLotSlot: false,
        maxProperties: -1, // Unlimited
        maxImagesPerProperty: 50 // Default, adjusted by business type
    }
};

// Image limits by business type for property vendors
const PROPERTY_IMAGE_LIMITS = {
    [BUSINESS_TYPES.DEVELOPER]: 50,
    [BUSINESS_TYPES.BROKER]: 5,
    [BUSINESS_TYPES.PROPERTY_BROKER]: 5
};

class SubscriptionRulesService {
    /**
     * Get vendor's active subscription with plan details
     * @param {String} vendorId - Vendor ID
     * @returns {Object|null} Subscription details or null
     */
    async getActiveSubscription(vendorId) {
        try {
            const vendor = await Vendor.findById(vendorId)
                .select('currentSubscription businessType businessTypeRef')
                .lean();

            if (!vendor) {
                return null;
            }

            let subscription = null;

            // Priority 1: Check vendor's currentSubscription reference
            if (vendor.currentSubscription) {
                subscription = await VendorSubscription.findById(vendor.currentSubscription)
                    .populate({
                        path: 'planId',
                        select: 'name duration price features isActive'
                    })
                    .lean();
            }

            // Priority 2: Find active subscription
            if (!subscription || subscription.status !== 'active') {
                subscription = await VendorSubscription.findOne({
                    vendorId,
                    status: 'active'
                })
                    .populate({
                        path: 'planId',
                        select: 'name duration price features isActive'
                    })
                    .sort({ createdAt: -1 })
                    .lean();
            }

            if (!subscription) {
                return null;
            }

            // Check if subscription is valid (not expired and active)
            const now = new Date();
            if (subscription.status !== 'active' || new Date(subscription.endDate) < now) {
                return null;
            }

            return {
                subscription,
                plan: subscription.planId,
                vendor: {
                    businessType: vendor.businessType,
                    businessTypeRef: vendor.businessTypeRef
                }
            };
        } catch (error) {
            console.error('Error getting active subscription:', error);
            return null;
        }
    }

    /**
     * Determine plan type from plan name
     * @param {String} planName - Plan name from database
     * @returns {String} Plan type constant
     */
    determinePlanType(planName) {
        if (!planName) return null;

        const name = planName.toLowerCase();

        if (name.includes('diamond')) return PLAN_TYPES.DIAMOND;
        if (name.includes('silver')) return PLAN_TYPES.SILVER;
        if (name.includes('basic')) return PLAN_TYPES.BASIC;
        if (name.includes('premium')) return PLAN_TYPES.PREMIUM;

        // Default mappings based on duration for backward compatibility
        return PLAN_TYPES.BASIC;
    }

    /**
     * Determine business type slug from vendor data
     * @param {String} businessType - Business type string
     * @returns {String} Normalized business type slug
     */
    normalizeBusinessType(businessType) {
        if (!businessType) return BUSINESS_TYPES.TEXTILE;

        const bt = businessType.toLowerCase().trim();

        if (bt.includes('developer')) return BUSINESS_TYPES.DEVELOPER;
        if (bt.includes('broker')) return BUSINESS_TYPES.BROKER;
        if (bt.includes('property')) return BUSINESS_TYPES.DEVELOPER; // Default for property

        return BUSINESS_TYPES.TEXTILE;
    }

    /**
     * Check if vendor has active subscription
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { hasSubscription, message, subscription }
     */
    async checkHasActiveSubscription(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                hasSubscription: false,
                message: 'No active subscription found. Please purchase a plan to continue.',
                subscription: null
            };
        }

        return {
            hasSubscription: true,
            message: 'Active subscription found.',
            subscription: subData.subscription
        };
    }

    /**
     * Check if vendor can create a new product listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, currentCount, limit }
     */
    async canCreateProduct(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                allowed: false,
                message: 'Active subscription required to add products.',
                currentCount: 0,
                limit: 0
            };
        }

        const planType = this.determinePlanType(subData.plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
        const currentCount = await this.getProductCount(vendorId);

        // Check if plan allows products at all
        if (limits.maxProducts === 0) {
            return {
                allowed: false,
                message: `Your current plan (${subData.plan?.name}) does not allow product listings.`,
                currentCount,
                limit: 0
            };
        }

        // Check against limit (-1 is unlimited)
        if (limits.maxProducts !== -1 && currentCount >= limits.maxProducts) {
            return {
                allowed: false,
                message: `Product limit reached (${limits.maxProducts}). Please upgrade your plan.`,
                currentCount,
                limit: limits.maxProducts
            };
        }

        return {
            allowed: true,
            message: 'Product creation allowed.',
            currentCount,
            limit: limits.maxProducts
        };
    }

    /**
     * Check if vendor can create lot/slot listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message }
     */
    async canCreateLotSlot(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                allowed: false,
                message: 'Active subscription required for Lot/Slot listings.'
            };
        }

        const planType = this.determinePlanType(subData.plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];

        if (!limits.allowLotSlot) {
            return {
                allowed: false,
                message: 'Lot/Slot listings are only available in the Diamond plan.'
            };
        }

        return {
            allowed: true,
            message: 'Lot/Slot listing allowed.'
        };
    }

    /**
     * Check if vendor can create property listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, maxImages }
     */
    async canCreateProperty(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                allowed: false,
                message: 'Active subscription required for property listings.',
                maxImages: 0
            };
        }

        const planType = this.determinePlanType(subData.plan?.name);

        // Property listings are usually for Premium plans
        if (planType !== PLAN_TYPES.PREMIUM) {
            return {
                allowed: false,
                message: 'Your current plan does not support property listings.',
                maxImages: 0
            };
        }

        const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
        const maxImages = PROPERTY_IMAGE_LIMITS[businessType] || 5;

        return {
            allowed: true,
            message: 'Property listing allowed.',
            maxImages
        };
    }

    /**
     * Get current product count for vendor
     * @param {String} vendorId - Vendor ID
     * @returns {Number} Product count
     */
    async getProductCount(vendorId) {
        try {
            return await Product.countDocuments({
                vendorId,
                isActive: { $ne: false },
                formType: { $ne: 'property' } // Don't count properties as products
            });
        } catch (error) {
            console.error('Error counting products:', error);
            return 0;
        }
    }

    /**
     * Get current lot/slot count for vendor
     * @param {String} vendorId - Vendor ID
     * @returns {Number} LotSlot count
     */
    async getLotSlotCount(vendorId) {
        try {
            return await LotSlot.countDocuments({
                vendorId,
                isActive: { $ne: false }
            });
        } catch (error) {
            console.error('Error counting lot/slots:', error);
            return 0;
        }
    }

    /**
     * Get subscription status summary for vendor
     * Includes all limits and current usage
     * @param {String} vendorId - Vendor ID
     * @returns {Object} Complete subscription status
     */
    async getSubscriptionStatus(vendorId) {
        const subData = await this.getActiveSubscription(vendorId);

        if (!subData) {
            return {
                hasSubscription: false,
                plan: null,
                limits: {
                    products: { allowed: false, limit: 0, current: await this.getProductCount(vendorId) },
                    lotSlot: { allowed: false, current: await this.getLotSlotCount(vendorId) },
                    properties: { allowed: false, maxImages: 0 }
                }
            };
        }

        const planType = this.determinePlanType(subData.plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
        const businessType = this.normalizeBusinessType(subData.vendor?.businessType);

        return {
            hasSubscription: true,
            plan: {
                id: subData.plan?._id,
                name: subData.plan?.name,
                type: planType,
                expiresAt: subData.subscription?.endDate
            },
            businessType: subData.vendor?.businessType,
            limits: {
                products: {
                    allowed: limits.maxProducts !== 0,
                    limit: limits.maxProducts,
                    current: await this.getProductCount(vendorId),
                    remaining: limits.maxProducts === -1 ? -1 : Math.max(0, limits.maxProducts - await this.getProductCount(vendorId))
                },
                lotSlot: {
                    allowed: limits.allowLotSlot,
                    current: await this.getLotSlotCount(vendorId)
                },
                properties: {
                    allowed: planType === PLAN_TYPES.PREMIUM,
                    maxImages: PROPERTY_IMAGE_LIMITS[businessType] || 5
                }
            }
        };
    }
}

export default new SubscriptionRulesService();
