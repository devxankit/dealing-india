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
import ShopUnit from '../models/ShopUnit.model.js';
import Reel from '../models/Reel.model.js';
import VendorAddon from '../models/VendorAddon.model.js';
import vendorAddonService from './vendorAddon.service.js';

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
 
// Reel limits configuration
const REEL_LIMITS = {
    [PLAN_TYPES.BASIC]: 0,
    [PLAN_TYPES.SILVER]: 20,
    [PLAN_TYPES.DIAMOND]: -1, // Unlimited
    [PLAN_TYPES.PREMIUM]: -1  // Unlimited
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
                        select: 'name duration price features isActive productLimit reelsLimit lotSlotLimit imagesPerListing shopSlideshow'
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
                        select: 'name duration price features isActive productLimit reelsLimit lotSlotLimit imagesPerListing shopSlideshow'
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
            // Allow access even without subscription (testing/pre-subscription phase)
            return {
                hasSubscription: true,
                message: 'Access granted (no subscription required).',
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
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'products')
            ]);

            const currentCount = await this.getProductCount(vendorId);

            // 1. Business Type Restriction: Only Textile/General B2B can create products
            if (subData) {
                const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
                if (businessType !== BUSINESS_TYPES.TEXTILE) {
                    return { 
                        allowed: false, 
                        message: 'Product listings are only available for Textile/B2B vendors. Your current business category does not support this task.' 
                    };
                }
            }

            // If no subscription, check for addons only (assuming testing phase fallback)
            if (!subData) {
                if (addonCount > 0) return { allowed: true, useAddon: true, currentCount, limit: 0, addonCount };
                return { allowed: true, message: 'Free access.', currentCount, limit: -1 };
            }

            const plan = subData.plan;
            const planType = this.determinePlanType(plan?.name);
            const legacyLimits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
            
            // 🔹 Dynamic Limit Check
            let subLimit = legacyLimits.maxProducts;
            if (plan && plan.productLimit !== undefined) {
                subLimit = plan.productLimit === 'unlimited' ? -1 : Number(plan.productLimit);
            }

            // 2. Check Subscription limit
            if (subLimit === -1 || currentCount < subLimit) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            // 3. Check Addon pool
            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Product listing limit reached. Please upgrade your plan or purchase an add-on.',
                currentCount, 
                limit: subLimit,
                requiresAddon: true,
                featureType: 'products'
            };
        } catch (error) {
            console.error('Error in canCreateProduct:', error);
            return { allowed: false, message: 'Encryption error check.' };
        }
    }

    /**
     * Check if vendor can create lot/slot listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message }
     */
    async canCreateLotSlot(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'lot_slot')
            ]);

            // 1. Business Type Restriction
            if (subData) {
                const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
                if (businessType !== BUSINESS_TYPES.TEXTILE) {
                    return { 
                        allowed: false, 
                        message: 'Lot/Slot tasks are only available for Textile manufacturers.' 
                    };
                }
            }

            // 2. Check Subscription allowance
            if (subData) {
                const plan = subData.plan;
                const planType = this.determinePlanType(plan?.name);
                const legacyLimits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
                
                let isAllowed = legacyLimits.allowLotSlot;
                if (plan && plan.lotSlotLimit !== undefined) {
                    isAllowed = plan.lotSlotLimit === 'unlimited' || Number(plan.lotSlotLimit) > 0;
                }

                if (isAllowed) {
                    return { allowed: true, useAddon: false };
                }
            }

            // 3. Check Addon pool
            if (addonCount > 0) {
                return { allowed: true, useAddon: true, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Lot/Slot listings are not included in your current plan. Please upgrade to Diamond or purchase a Lot/Slot add-on.',
                requiresAddon: true,
                featureType: 'lot_slot'
            };
        } catch (error) {
            console.error('Error in canCreateLotSlot:', error);
            return { allowed: false, message: 'Limit check failed.' };
        }
    }

    /**
     * Check if vendor can create property listing
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, message, maxImages }
     */
    async canCreateProperty(vendorId) {
        try {
            const subData = await this.getActiveSubscription(vendorId);
            
            // 1. Business Type Restriction: Only Developer/Broker can create properties
            if (subData) {
                const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
                if (businessType === BUSINESS_TYPES.TEXTILE) {
                    return { 
                        allowed: false, 
                        message: 'Property listings are only available for Developers and Brokers. Your current business category does not support this task.' 
                    };
                }
            }

            // Note: Currently property vendors don't have per-unit addons, but we check plan type
            if (!subData) {
                return { allowed: true, message: 'Free listing.', maxImages: 10 };
            }

            const plan = subData.plan;
            const planType = this.determinePlanType(plan?.name);
            const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
            const legacyLimits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];

            // 🔹 Dynamic Image Limit
            let maxImages = PROPERTY_IMAGE_LIMITS[businessType] || 5;
            if (plan && plan.imagesPerListing !== undefined) {
                maxImages = plan.imagesPerListing === 'unlimited' ? -1 : Number(plan.imagesPerListing);
            }

            // Must have a Premium plan OR explicitly allowed images
            if (planType === PLAN_TYPES.PREMIUM || (plan && plan.imagesPerListing !== undefined)) {
                return { 
                    allowed: true, 
                    maxImages: maxImages 
                };
            }

            return { 
                allowed: false, 
                message: 'Property listings require a Premium subscription.',
                requiresUpgrade: true
            };
        } catch (error) {
            console.error('Error in canCreateProperty:', error);
            return { allowed: false, message: 'Access check failed.' }
        }
    }

    /**
     * Check if vendor can upload a reel
     * @param {String} vendorId - Vendor ID
     * @returns {Object} { allowed, useAddon, addonCount }
     */
    async canUploadReel(vendorId) {
        try {
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'reels')
            ]);

            const currentCount = await this.getReelCount(vendorId);
            
            // Reels are typically limited or infinite based on plan.
            let subLimit = 0;
            if (subData) {
                const plan = subData.plan;
                const planType = this.determinePlanType(plan?.name);
                
                // 🔹 Dynamic Limit check
                if (plan && plan.reelsLimit !== undefined) {
                    subLimit = plan.reelsLimit === 'unlimited' ? -1 : Number(plan.reelsLimit);
                } else {
                    // Legacy hardcoded limits
                    if (planType === PLAN_TYPES.DIAMOND || planType === PLAN_TYPES.PREMIUM) subLimit = -1;
                    else if (planType === PLAN_TYPES.SILVER) subLimit = 20;
                    else subLimit = 5;
                }
            } else {
                subLimit = 3; // Free default
            }

            if (subLimit === -1 || currentCount < subLimit) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Reel upload limit reached. Purchase a Reel Pack to upload more.',
                requiresAddon: true,
                featureType: 'reels'
            };
        } catch (error) {
            console.error('Error in canUploadReel:', error);
            return { allowed: false, message: 'Limit check failed.' };
        }
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
            // Lifetime count: include all ever created (even inactive/deleted) 
            // to prevent reuse of slots.
            return await LotSlot.countDocuments({
                vendorId
            });
        } catch (error) {
            console.error('Error counting lot/slots:', error);
            return 0;
        }
    }

    /**
     * Get current reel count for vendor
     * @param {String} vendorId - Vendor ID
     * @returns {Number} Reel count
     */
    async getReelCount(vendorId) {
        try {
            return await Reel.countDocuments({
                uploaderId: vendorId,
                uploaderType: 'vendor'
            });
        } catch (error) {
            console.error('Error counting reels:', error);
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
        const [subData, shop, addons] = await Promise.all([
            this.getActiveSubscription(vendorId),
            ShopUnit.findOne({ vendorId }).select('_id').lean(),
            VendorAddon.find({ vendorId, status: 'active' }).lean()
        ]);

        const hasShop = !!shop;
        const addonStats = {
            reels: addons.filter(a => a.featureType === 'reels').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0),
            products: addons.filter(a => a.featureType === 'products').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0),
            lot_slot: addons.filter(a => a.featureType === 'lot_slot').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0)
        };

        if (!subData) {
            // No subscription: Allow everything by default (testing/pre-subscription phase)
            return {
                hasSubscription: true,
                hasShop,
                plan: {
                    id: null,
                    name: 'Free Access',
                    type: 'free',
                    expiresAt: null
                },
                businessType: null,
                limits: {
                    products: { allowed: true, limit: -1, current: await this.getProductCount(vendorId), remaining: -1 },
                    lotSlot: { allowed: true, current: await this.getLotSlotCount(vendorId) },
                    properties: { allowed: true, maxImages: 10 },
                    reels: { allowed: true, limit: -1, current: await this.getReelCount(vendorId) }
                },
                addons: addonStats
            };
        }

        const planType = this.determinePlanType(subData.plan?.name);
        const limits = PLAN_LIMITS[planType] || PLAN_LIMITS[PLAN_TYPES.BASIC];
        const businessType = this.normalizeBusinessType(subData.vendor?.businessType);

        const productCount = await this.getProductCount(vendorId);
        const lotSlotCount = await this.getLotSlotCount(vendorId);
        const reelCount = await this.getReelCount(vendorId);

        const plan = subData.plan;
        
        // Dynamic limits with fallbacks
        let productLimitValue = limits.maxProducts;
        if (plan && plan.productLimit !== undefined) {
            productLimitValue = plan.productLimit === 'unlimited' ? -1 : Number(plan.productLimit);
        }

        let lotSlotAllowed = limits.allowLotSlot;
        if (plan && plan.lotSlotLimit !== undefined) {
            lotSlotAllowed = plan.lotSlotLimit === 'unlimited' || Number(plan.lotSlotLimit) > 0;
        }

        let reelLimitValue = REEL_LIMITS[planType] || 0;
        if (plan && plan.reelsLimit !== undefined) {
            reelLimitValue = plan.reelsLimit === 'unlimited' ? -1 : Number(plan.reelsLimit);
        }

        let imagesPerProduct = PROPERTY_IMAGE_LIMITS[businessType] || 5;
        if (plan && plan.imagesPerListing !== undefined) {
            imagesPerProduct = plan.imagesPerListing === 'unlimited' ? -1 : Number(plan.imagesPerListing);
        }

        return {
            hasSubscription: true,
            hasShop,
            plan: {
                id: plan?._id,
                name: plan?.name,
                type: planType,
                expiresAt: subData.subscription?.endDate
            },
            businessType: subData.vendor?.businessType,
            limits: {
                products: {
                    allowed: productLimitValue !== 0,
                    limit: productLimitValue,
                    current: productCount,
                    remaining: productLimitValue === -1 ? -1 : Math.max(0, productLimitValue - productCount),
                    hasAddon: addonStats.products > 0
                },
                lotSlot: {
                    allowed: lotSlotAllowed,
                    current: lotSlotCount,
                    hasAddon: addonStats.lot_slot > 0
                },
                properties: {
                    allowed: planType === PLAN_TYPES.PREMIUM || planType === PLAN_TYPES.DIAMOND || (plan && plan.imagesPerListing !== undefined),
                    maxImages: imagesPerProduct
                },
                reels: {
                    allowed: true, // Always allowed if has subscription
                    limit: reelLimitValue,
                    current: reelCount,
                    remaining: reelLimitValue === -1 ? -1 : Math.max(0, reelLimitValue - reelCount),
                    hasAddon: addonStats.reels > 0
                },
                shopSlideshow: plan?.shopSlideshow || false
            },
            addons: addonStats
        };
    }
}

export default new SubscriptionRulesService();
