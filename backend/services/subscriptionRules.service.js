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
        // Temporarily allowing all vendors regardless of subscription status
        return {
            hasSubscription: true,
            message: 'Active status granted (Temporary)',
            subscription: { status: 'active', planId: { name: 'Unlimited' } }
        };
    }

    /**
     * Check if vendor can create a new product listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, currentCount, limit }
     */
    async canCreateProduct(vendorId) {
        // Temporarily allowing all vendors to create products regardless of plan or business type
        return {
            allowed: true,
            message: 'Product creation allowed (Temporary)',
            currentCount: await this.getProductCount(vendorId),
            limit: -1
        };
    }

    /**
     * Check if vendor can create lot/slot listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message }
     */
    async canCreateLotSlot(vendorId) {
        // Temporarily allowing all vendors to create lot/slots
        return {
            allowed: true,
            message: 'Lot/Slot listing allowed (Temporary)'
        };
    }

    /**
     * Check if vendor can create property listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, maxImages }
     */
    async canCreateProperty(vendorId) {
        // Temporarily allowing all vendors to create properties with high image limit
        return {
            allowed: true,
            message: 'Property listing allowed (Temporary).',
            maxImages: 100
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
        // Temporarily returning unrestricted status for all vendors
        return {
            hasSubscription: true,
            plan: {
                id: 'unlimited-temp-id',
                name: 'Diamond (Unrestricted)',
                type: PLAN_TYPES.DIAMOND,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            },
            businessType: 'all',
            limits: {
                products: {
                    allowed: true,
                    limit: -1,
                    current: await this.getProductCount(vendorId),
                    remaining: -1
                },
                lotSlot: {
                    allowed: true,
                    current: await this.getLotSlotCount(vendorId)
                },
                properties: {
                    allowed: true,
                    maxImages: 100
                }
            }
        };
    }
}

export default new SubscriptionRulesService();
