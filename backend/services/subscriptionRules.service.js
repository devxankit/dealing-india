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
                        select: 'name duration price features isActive allowedBusinessTypes'
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
                        select: 'name duration price features isActive allowedBusinessTypes'
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
        const result = await this.getActiveSubscription(vendorId);

        if (!result) {
            return {
                hasSubscription: false,
                message: 'Please purchase a subscription plan to start listing.',
                subscription: null
            };
        }

        return {
            hasSubscription: true,
            message: 'Active subscription found',
            subscription: result
        };
    }

    /**
     * Check if vendor can create a new product listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, currentCount, limit }
     */
    async canCreateProduct(vendorId) {
        const subCheck = await this.checkHasActiveSubscription(vendorId);

        if (!subCheck.hasSubscription) {
            return {
                allowed: false,
                message: subCheck.message,
                currentCount: 0,
                limit: 0
            };
        }

        const { subscription, plan, vendor } = subCheck.subscription;
        const planType = this.determinePlanType(plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];

        // Check if this is a property business type trying to add products
        const businessTypeSlug = this.normalizeBusinessType(vendor.businessType);
        if (businessTypeSlug === BUSINESS_TYPES.DEVELOPER || businessTypeSlug === BUSINESS_TYPES.BROKER) {
            return {
                allowed: false,
                message: 'Property vendors cannot list products. Please use property listings.',
                currentCount: 0,
                limit: 0
            };
        }

        // If unlimited products allowed
        if (limits.maxProducts === -1) {
            return {
                allowed: true,
                message: 'Unlimited products allowed',
                currentCount: await this.getProductCount(vendorId),
                limit: -1
            };
        }

        // Count current products
        const currentCount = await this.getProductCount(vendorId);

        if (currentCount >= limits.maxProducts) {
            return {
                allowed: false,
                message: `Product limit reached (${currentCount}/${limits.maxProducts}). Please upgrade your plan.`,
                currentCount,
                limit: limits.maxProducts
            };
        }

        return {
            allowed: true,
            message: `You can add ${limits.maxProducts - currentCount} more products`,
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
        const subCheck = await this.checkHasActiveSubscription(vendorId);

        if (!subCheck.hasSubscription) {
            return {
                allowed: false,
                message: subCheck.message
            };
        }

        const { plan, vendor } = subCheck.subscription;
        const planType = this.determinePlanType(plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];

        // Check business type - only textile vendors can list lot/slot
        const businessTypeSlug = this.normalizeBusinessType(vendor.businessType);
        if (businessTypeSlug !== BUSINESS_TYPES.TEXTILE) {
            return {
                allowed: false,
                message: 'Only Textile vendors can list Lots/Slots.'
            };
        }

        if (!limits.allowLotSlot) {
            return {
                allowed: false,
                message: 'Lot/Slot listings require Diamond plan. Please upgrade your subscription.'
            };
        }

        return {
            allowed: true,
            message: 'Lot/Slot listing allowed'
        };
    }

    /**
     * Check if vendor can create property listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, maxImages }
     */
    async canCreateProperty(vendorId) {
        const subCheck = await this.checkHasActiveSubscription(vendorId);

        if (!subCheck.hasSubscription) {
            return {
                allowed: false,
                message: subCheck.message,
                maxImages: 0
            };
        }

        const { plan, vendor } = subCheck.subscription;
        const businessTypeSlug = this.normalizeBusinessType(vendor.businessType);

        // Only property business types can list properties
        if (businessTypeSlug === BUSINESS_TYPES.TEXTILE) {
            return {
                allowed: false,
                message: 'Textile vendors cannot list properties. Please use product listings.',
                maxImages: 0
            };
        }

        // Get image limit based on business type
        const maxImages = PROPERTY_IMAGE_LIMITS[businessTypeSlug] || 50;

        return {
            allowed: true,
            message: `Property listing allowed. Maximum ${maxImages} images per property.`,
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
                isActive: { $ne: false }
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
        const subCheck = await this.checkHasActiveSubscription(vendorId);

        if (!subCheck.hasSubscription) {
            return {
                hasSubscription: false,
                message: subCheck.message,
                plan: null,
                limits: {
                    products: { allowed: false, limit: 0, current: 0 },
                    lotSlot: { allowed: false },
                    properties: { allowed: false, maxImages: 0 }
                }
            };
        }

        const { subscription, plan, vendor } = subCheck.subscription;
        const planType = this.determinePlanType(plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
        const businessTypeSlug = this.normalizeBusinessType(vendor.businessType);

        const productCount = await this.getProductCount(vendorId);
        const lotSlotCount = await this.getLotSlotCount(vendorId);

        // Determine which listings are allowed based on business type
        const isPropertyBusiness = businessTypeSlug === BUSINESS_TYPES.DEVELOPER ||
            businessTypeSlug === BUSINESS_TYPES.BROKER;

        return {
            hasSubscription: true,
            plan: {
                id: plan?._id,
                name: plan?.name,
                type: planType,
                expiresAt: subscription.endDate
            },
            businessType: businessTypeSlug,
            limits: {
                products: {
                    allowed: !isPropertyBusiness,
                    limit: limits.maxProducts,
                    current: productCount,
                    remaining: limits.maxProducts === -1 ? -1 : Math.max(0, limits.maxProducts - productCount)
                },
                lotSlot: {
                    allowed: !isPropertyBusiness && limits.allowLotSlot,
                    current: lotSlotCount
                },
                properties: {
                    allowed: isPropertyBusiness,
                    maxImages: PROPERTY_IMAGE_LIMITS[businessTypeSlug] || 50
                }
            }
        };
    }
}

export default new SubscriptionRulesService();
