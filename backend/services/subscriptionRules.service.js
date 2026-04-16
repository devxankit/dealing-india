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
import Property from '../models/Property.model.js';
import vendorAddonService from './vendorAddon.service.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';

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
                        select: 'name duration price features isActive productLimit propertyLimit reelsLimit lotSlotLimit imagesPerListing shopSlideshow'
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
                        select: 'name duration price features isActive productLimit propertyLimit reelsLimit lotSlotLimit imagesPerListing shopSlideshow'
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
                message: 'Active subscription required to access this feature.',
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
     * Check if vendor can create/update their Shop Listing
     * @param {String} vendorId 
     */
    async canListShop(vendorId) {
        try {
            const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
            if (!vendor) return { allowed: false, message: 'Vendor not found' };

            // 1. Regular check: If they have a subscription, they can always list shop
            const subData = await this.getActiveSubscription(vendorId);
            if (subData) return { allowed: true };

            // 3. New Policy: Allow shop listing for free for all vendors (as of April 2026)
            return { 
                allowed: true, 
                message: 'Shop listing is free for all vendors.' 
            };
        } catch (error) {
            console.error('Error in canListShop rule:', error);
            return { allowed: false, message: 'Eligibility check failed.' };
        }
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

            // 1. MUST HAVE SUBSCRIPTION
            if (!subData) {
                const currentCount = await this.getProductCount(vendorId);
                // If no subscription, check for addons only
                if (addonCount > 0) return { allowed: true, useAddon: true, currentCount, limit: 0, addonCount };
                
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add products.',
                    subscriptionRequired: true
                };
            }

            // 2. Subscription Limit Check (Bypassing hard business type block to allow flexibility)
            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await this.getProductCount(vendorId, sinceDate);
            
            // 🔹 Dynamic Limit Check from DB
            const subLimit = plan.productLimit === 'unlimited' ? -1 : (Number(plan.productLimit) || 0);

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

            // 1. Subscription Check (Bypassing hard business type block)
            if (subData) {
                // Logic removed specialized block to allow flexible modules
            }

            // 2. MUST HAVE SUBSCRIPTION
            if (!subData) {
                // If no subscription, check for addons only
                if (addonCount > 0) return { allowed: true, useAddon: true, addonCount };
                
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add Lot/Slot listings.',
                    subscriptionRequired: true
                };
            }

            // 3. Check Subscription allowance
            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await this.getLotSlotCount(vendorId, sinceDate);
            const subLimit = plan.lotSlotLimit === 'unlimited' ? -1 : (Number(plan.lotSlotLimit) || 0);

            if (subLimit === -1 || (subLimit > 0 && currentCount < subLimit)) {
                return { allowed: true, useAddon: false, currentCount, limit: subLimit };
            }

            // 4. Check Addon pool
            if (addonCount > 0) {
                return { allowed: true, useAddon: true, currentCount, limit: subLimit, addonCount };
            }

            return { 
                allowed: false, 
                message: 'Lot/Slot listing limit reached for your current plan. Please upgrade or purchase a Lot/Slot add-on.',
                currentCount,
                limit: subLimit,
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
            const [subData, addonCount] = await Promise.all([
                this.getActiveSubscription(vendorId),
                vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'property')
            ]);
            
            // 1. Check for addon logic if NO subscription at all
            if (!subData && addonCount > 0) {
                const currentCount = await Property.countDocuments({ vendorId, isActive: { $ne: false } });
                return { 
                    allowed: true, 
                    useAddon: true, 
                    current: currentCount, 
                    limit: 0, 
                    addonCount,
                    maxImages: 50 // Default for property addons
                };
            }

            if (!subData) {
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add properties.',
                    subscriptionRequired: true
                };
            }

            const plan = subData.plan || {};
            const sinceDate = subData.subscription?.startDate || new Date(0);
            const currentCount = await Property.countDocuments({ 
                vendorId, 
                isActive: { $ne: false },
                createdAt: { $gte: sinceDate }
            });

            // 🔹 Determine Property Limit
            const subLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);
            const maxImages = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
            
            // 2. Try to use Subscription allowance
            // Allow if subLimit is -1 (unlimited) or if currentCount < subLimit
            if (subLimit === -1 || (subLimit > 0 && currentCount < subLimit)) {
                return { 
                    allowed: true, 
                    maxImages: maxImages,
                    current: currentCount,
                    limit: subLimit,
                    remaining: subLimit === -1 ? -1 : (subLimit - currentCount)
                };
            }

            // 3. Try to use Addon pool
            if (addonCount > 0) {
                return { 
                    allowed: true, 
                    useAddon: true, 
                    maxImages: maxImages || 50,
                    current: currentCount,
                    limit: subLimit,
                    addonCount
                };
            }

            // 4. No luck - return descriptive error
            if (subLimit === 0) {
                return { 
                    allowed: false, 
                    message: 'Property listings are not included in your current plan. Please upgrade or purchase an add-on.',
                    requiresUpgrade: true
                };
            }

            return {
                allowed: false,
                requiresAddon: true,
                featureType: 'property',
                message: `Property listing limit reached (${currentCount}/${subLimit}). Please purchase an add-on pack.`,
                maxImages
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

            // Reels are typically limited or infinite based on plan.
            let subLimit = 0;
            let currentCount = 0;
            if (subData) {
                const plan = subData.plan || {};
                const sinceDate = subData.subscription?.startDate || new Date(0);
                currentCount = await this.getReelCount(vendorId, sinceDate);
                subLimit = plan.reelsLimit === 'unlimited' ? -1 : (Number(plan.reelsLimit) || 0);
            } else {
                // Return false if no subscription and no addon
                if (addonCount === 0) {
                    return { 
                        allowed: false, 
                        message: 'An active subscription plan is required to upload reels.',
                        subscriptionRequired: true
                    };
                }
                subLimit = 0;
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
     * Get current product count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} Product count
     */
    async getProductCount(vendorId, sinceDate = null) {
        try {
            const query = {
                vendorId,
                isActive: { $ne: false },
                formType: { $ne: 'property' }
            };

            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }

            return await Product.countDocuments(query);
        } catch (error) {
            console.error('Error counting products:', error);
            return 0;
        }
    }

    /**
     * Get current lot/slot count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} LotSlot count
     */
    async getLotSlotCount(vendorId, sinceDate = null) {
        try {
            const query = { vendorId };
            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }
            return await LotSlot.countDocuments(query);
        } catch (error) {
            console.error('Error counting lot/slots:', error);
            return 0;
        }
    }

    /**
     * Get current reel count for vendor since a specific date
     * @param {String} vendorId - Vendor ID
     * @param {Date} sinceDate - Optional start date
     * @returns {Number} Reel count
     */
    async getReelCount(vendorId, sinceDate = null) {
        try {
            const query = {
                uploaderId: vendorId,
                uploaderType: 'vendor'
            };

            if (sinceDate) {
                query.createdAt = { $gte: sinceDate };
            }

            return await Reel.countDocuments(query);
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
            VendorAddon.find({ 
                vendorId, 
                status: { $in: ['active', 'consumed'] } 
            }).lean()
        ]);

        const hasShop = !!shop;

        // 🔹 Correct Addon Stats: Calculate BOTH Total Capacity and Remaining Units
        const addonStats = addons.reduce((acc, a) => {
            const ft = a.featureType;
            if (acc[ft]) {
                acc[ft].total += a.totalQuantity;
                acc[ft].remaining += Math.max(0, a.totalQuantity - a.usedCount);
            }
            return acc;
        }, {
            reels: { total: 0, remaining: 0 },
            products: { total: 0, remaining: 0 },
            lot_slot: { total: 0, remaining: 0 },
            property: { total: 0, remaining: 0 }
        });

        // For backward compatibility within some logic
        const addonBalances = {
            reels: addonStats.reels.remaining,
            products: addonStats.products.remaining,
            lot_slot: addonStats.lot_slot.remaining,
            property: addonStats.property.remaining
        };

        if (!subData) {
            // Fetch vendor info to ensure businessType is available even without subscription
            const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
            const businessType = vendor?.businessType;

            const productCount = await this.getProductCount(vendorId);
            const reelCount = await this.getReelCount(vendorId);
            const lotSlotCount = await this.getLotSlotCount(vendorId);
            const propertyCount = await Property.countDocuments({ vendorId, isActive: { $ne: false } });

            // Check if admin hasn't configured any plans for this business type
            const shopCheck = await this.canListShop(vendorId);

        const hasAddons = (addonStats.products.total + addonStats.reels.total + addonStats.lot_slot.total + addonStats.property.total) > 0;

        return {
            isActive: hasAddons,
            hasSubscription: hasAddons,
                isEligibleForShopListing: shopCheck.allowed,
                hasShop,
                plan: { id: null, name: 'No Active Plan', type: 'none', expiresAt: null },
                businessType: businessType || 'textile',
                limits: {
                    products: { 
                        allowed: addonStats.products.total > 0, 
                        limit: addonStats.products.total, 
                        current: productCount, 
                        remaining: Math.max(0, addonStats.products.total - productCount),
                        hasAddon: addonStats.products.total > 0
                    },
                    lotSlot: { 
                        allowed: addonStats.lot_slot.total > 0, 
                        limit: addonStats.lot_slot.total,
                        current: lotSlotCount, 
                        remaining: Math.max(0, addonStats.lot_slot.total - lotSlotCount),
                        hasAddon: addonStats.lot_slot.total > 0
                    },
                    properties: { 
                        allowed: addonStats.property.total > 0, 
                        limit: addonStats.property.total,
                        current: propertyCount,
                        remaining: Math.max(0, addonStats.property.total - propertyCount),
                        hasAddon: addonStats.property.total > 0,
                        maxImages: 50 
                    },
                    reels: { 
                        allowed: addonStats.reels.total > 0, 
                        limit: addonStats.reels.total, 
                        current: reelCount,
                        remaining: Math.max(0, addonStats.reels.total - reelCount),
                        hasAddon: addonStats.reels.total > 0
                    }
                },
                addons: addonBalances
            };
        }

        const plan = subData.plan || {};
        const sinceDate = subData.subscription?.startDate || new Date(0);

        const productCount = await this.getProductCount(vendorId, sinceDate);
        const lotSlotCount = await this.getLotSlotCount(vendorId, sinceDate);
        const reelCount = await this.getReelCount(vendorId, sinceDate);
        const propertyCount = await Property.countDocuments({ 
            vendorId, 
            isActive: { $ne: false },
            createdAt: { $gte: sinceDate }
        });

        // 🔹 Rule: Total Capacity = Plan Limit + ALL Addon Quantities
        const subProductLimit = plan.productLimit === 'unlimited' ? -1 : (Number(plan.productLimit) || 0);
        const subPropertyLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);
        const subLotSlotLimit = plan.lotSlotLimit === 'unlimited' ? -1 : (Number(plan.lotSlotLimit) || 0);
        const subReelLimit = plan.reelsLimit === 'unlimited' ? -1 : (Number(plan.reelsLimit) || 0);
        
        const totalProductLimit = subProductLimit === -1 ? -1 : (subProductLimit + addonStats.products.total);
        const totalPropertyLimit = subPropertyLimit === -1 ? -1 : (subPropertyLimit + addonStats.property.total);
        const totalLotSlotLimit = subLotSlotLimit === -1 ? -1 : (subLotSlotLimit + addonStats.lot_slot.total);
        const totalReelLimit = subReelLimit === -1 ? -1 : (subReelLimit + addonStats.reels.total);

        const imagesPerListing = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
        const shopSlideshow = !!plan.shopSlideshow;

        return {
            isActive: true,
            hasSubscription: true,
            hasShop,
            plan: {
                id: plan._id,
                name: plan.name,
                type: this.determinePlanType(plan.name),
                expiresAt: subData.subscription?.endDate
            },
            businessType: subData.vendor?.businessType,
            limits: {
                products: {
                    allowed: totalProductLimit !== 0,
                    limit: totalProductLimit,
                    current: productCount,
                    remaining: totalProductLimit === -1 ? -1 : Math.max(0, totalProductLimit - productCount),
                    hasAddon: addonStats.products.total > 0,
                    maxImages: imagesPerListing
                },
                lotSlot: {
                    allowed: totalLotSlotLimit !== 0,
                    limit: totalLotSlotLimit,
                    current: lotSlotCount,
                    remaining: totalLotSlotLimit === -1 ? -1 : Math.max(0, totalLotSlotLimit - lotSlotCount),
                    hasAddon: addonStats.lot_slot.total > 0
                },
                properties: {
                    allowed: totalPropertyLimit !== 0 || addonStats.property.total > 0,
                    limit: totalPropertyLimit,
                    current: propertyCount,
                    remaining: totalPropertyLimit === -1 ? -1 : Math.max(0, totalPropertyLimit - propertyCount),
                    hasAddon: addonStats.property.total > 0,
                    maxImages: imagesPerListing || 50
                },
                reels: {
                    allowed: true,
                    limit: totalReelLimit,
                    current: reelCount,
                    remaining: totalReelLimit === -1 ? -1 : Math.max(0, totalReelLimit - reelCount),
                    hasAddon: addonStats.reels.total > 0
                },
                shopSlideshow: shopSlideshow
            },
            addons: addonBalances
        };
    }

    async canUseShopSlideshow(vendorId) {
        try {
            const subData = await this.getActiveSubscription(vendorId);

            // Allow shop slideshows for free to ensure all vendors can present their business identity
            return { allowed: true };
        } catch (error) {
            console.error('Error in canUseShopSlideshow:', error);
            return { allowed: false, message: 'Access check failed.' };
        }
    }
}

export default new SubscriptionRulesService();
