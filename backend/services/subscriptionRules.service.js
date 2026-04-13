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

            // 2. Special check: If admin hasn't configured any plans for this business type, allow listing shop for free
            const settings = await BusinessTypeSettings.findOne({ 
                $or: [
                    { businessTypeId: vendor.businessTypeRef },
                    { businessTypeSlug: vendor.businessType?.toLowerCase() }
                ]
            }).lean();

            if (settings && Array.isArray(settings.allowedPlans) && settings.allowedPlans.length === 0) {
                return { 
                    allowed: true, 
                    message: `No subscription required for ${vendor.businessType} vendors. Shop listing allowed.` 
                };
            }

            return { 
                allowed: false, 
                message: 'To list your shop, you need to purchase any subscription plan.',
                subscriptionRequired: true
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
            const subData = await this.getActiveSubscription(vendorId);
            
            // 1. Subscription Check (Bypassing hard business type block)
            if (subData) {
                // Logic removed specialized block to allow flexible modules
            }

            // 1. MUST HAVE SUBSCRIPTION
            if (!subData) {
                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required to add properties.',
                    subscriptionRequired: true
                };
            }

            const plan = subData.plan || {};
            const businessType = this.normalizeBusinessType(subData.vendor?.businessType);

            // 🔹 Determine Property Limit
            const subLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);

            const maxImages = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
            
            // Allow if subLimit is -1 (unlimited) or > 0, OR if they have a Premium plan
            if (subLimit !== 0 || this.determinePlanType(plan.name) === PLAN_TYPES.PREMIUM || (plan && plan.imagesPerListing !== undefined)) {
                
                const sinceDate = subData.subscription?.startDate || new Date(0);
                const currentCount = await Product.countDocuments({ 
                    vendorId, 
                    formType: 'property',
                    createdAt: { $gte: sinceDate }
                });
                
                if (subLimit !== -1 && currentCount >= subLimit) {
                    const addonCount = await vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'property');
                    if (addonCount > 0) {
                        return { 
                            allowed: true, 
                            useAddon: true, 
                            maxImages: maxImages,
                            current: currentCount,
                            limit: subLimit,
                            addonCount
                        };
                    }
                    
                    return {
                        allowed: false,
                        requiresAddon: true,
                        featureType: 'property',
                        message: `Property listing limit reached (${currentCount}/${subLimit}). Please purchase an add-on pack.`,
                        maxImages
                    };
                }

                return { 
                    allowed: true, 
                    maxImages: maxImages,
                    current: currentCount,
                    limit: subLimit,
                    remaining: subLimit === -1 ? -1 : (subLimit - currentCount)
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
            VendorAddon.find({ vendorId, status: 'active' }).lean()
        ]);

        const hasShop = !!shop;
        const addonStats = {
            reels: addons.filter(a => a.featureType === 'reels').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0),
            products: addons.filter(a => a.featureType === 'products').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0),
            lot_slot: addons.filter(a => a.featureType === 'lot_slot').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0),
            property: addons.filter(a => a.featureType === 'property').reduce((sum, a) => sum + (a.totalQuantity - a.usedCount), 0)
        };

        if (!subData) {
            // Fetch vendor info to ensure businessType is available even without subscription
            const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
            const businessType = vendor?.businessType;

            const productCount = await this.getProductCount(vendorId);
            const reelCount = await this.getReelCount(vendorId);
            const lotSlotCount = await this.getLotSlotCount(vendorId);
            const propertyCount = await Product.countDocuments({ vendorId, formType: 'property' });

            // Check if admin hasn't configured any plans for this business type
            const shopCheck = await this.canListShop(vendorId);

            return {
                hasSubscription: (addonStats.products + addonStats.reels + addonStats.lot_slot) > 0 || shopCheck.allowed,
                isEligibleForShopListing: shopCheck.allowed,
                hasShop,
                plan: { id: null, name: 'No Active Plan', type: 'none', expiresAt: null },
                businessType: businessType || 'textile',
                limits: {
                    products: { 
                        allowed: addonStats.products > 0, 
                        limit: addonStats.products, 
                        current: productCount, 
                        remaining: Math.max(0, addonStats.products - productCount),
                        hasAddon: addonStats.products > 0
                    },
                    lotSlot: { 
                        allowed: addonStats.lot_slot > 0, 
                        limit: addonStats.lot_slot,
                        current: lotSlotCount, 
                        remaining: Math.max(0, addonStats.lot_slot - lotSlotCount),
                        hasAddon: addonStats.lot_slot > 0
                    },
                    properties: { 
                        allowed: addonStats.property > 0, 
                        limit: addonStats.property,
                        current: propertyCount,
                        remaining: Math.max(0, addonStats.property - propertyCount),
                        hasAddon: addonStats.property > 0,
                        maxImages: 0 
                    },
                    reels: { 
                        allowed: addonStats.reels > 0, 
                        limit: addonStats.reels, 
                        current: reelCount,
                        remaining: Math.max(0, addonStats.reels - reelCount),
                        hasAddon: addonStats.reels > 0
                    }
                },
                addons: addonStats
            };
        }

        const plan = subData.plan || {};
        const businessType = this.normalizeBusinessType(subData.vendor?.businessType);
        const sinceDate = subData.subscription?.startDate || new Date(0);

        const productCount = await this.getProductCount(vendorId, sinceDate);
        const lotSlotCount = await this.getLotSlotCount(vendorId, sinceDate);
        const reelCount = await this.getReelCount(vendorId, sinceDate);
        const propertyCount = await Product.countDocuments({ 
            vendorId, 
            formType: 'property',
            createdAt: { $gte: sinceDate }
        });

        // 🔹 Rule: Calculate total capacity including addons
        const subProductLimit = plan.productLimit === 'unlimited' ? -1 : (Number(plan.productLimit) || 0);
        const subPropertyLimit = plan.propertyLimit === 'unlimited' ? -1 : (Number(plan.propertyLimit) || 0);
        const subLotSlotLimit = plan.lotSlotLimit === 'unlimited' ? -1 : (Number(plan.lotSlotLimit) || 0);
        const subReelLimit = plan.reelsLimit === 'unlimited' ? -1 : (Number(plan.reelsLimit) || 0);
        
        // 🔹 Correct Remaining Calculation: Total Limit (Base + Addon) - Current Usage
        const totalProductLimit = subProductLimit === -1 ? -1 : (subProductLimit + addonStats.products);
        const productRemaining = totalProductLimit === -1 ? -1 : Math.max(0, totalProductLimit - productCount);

        const totalLotSlotLimit = subLotSlotLimit === -1 ? -1 : (subLotSlotLimit + addonStats.lot_slot);
        const lotSlotRemaining = totalLotSlotLimit === -1 ? -1 : Math.max(0, totalLotSlotLimit - lotSlotCount);

        const totalReelLimit = subReelLimit === -1 ? -1 : (subReelLimit + addonStats.reels);
        const reelRemaining = totalReelLimit === -1 ? -1 : Math.max(0, totalReelLimit - reelCount);

        const imagesPerListing = plan.imagesPerListing === 'unlimited' ? -1 : (Number(plan.imagesPerListing) || 0);
        const shopSlideshow = !!plan.shopSlideshow;

        // Properties follow propertyLimit from DB
        const propertyLimitValue = subPropertyLimit;

        return {
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
                    remaining: productRemaining,
                    hasAddon: addonStats.products > 0,
                    maxImages: imagesPerListing
                },
                lotSlot: {
                    allowed: totalLotSlotLimit !== 0,
                    limit: totalLotSlotLimit,
                    current: lotSlotCount,
                    remaining: lotSlotRemaining,
                    hasAddon: addonStats.lot_slot > 0
                },
                properties: {
                    allowed: propertyLimitValue !== 0 || addonStats.property > 0,
                    limit: propertyLimitValue === -1 ? -1 : (propertyLimitValue + addonStats.property),
                    current: propertyCount,
                    remaining: propertyLimitValue === -1 ? -1 : (Math.max(0, propertyLimitValue - propertyCount) + addonStats.property),
                    hasAddon: addonStats.property > 0,
                    maxImages: imagesPerListing
                },
                reels: {
                    allowed: true,
                    limit: totalReelLimit,
                    current: reelCount,
                    remaining: reelRemaining,
                    hasAddon: addonStats.reels > 0
                },
                shopSlideshow: shopSlideshow
            },
            addons: addonStats
        };
    }

    async canUseShopSlideshow(vendorId) {
        try {
            const subData = await this.getActiveSubscription(vendorId);

            if (!subData) {
                // Check if they are eligible for shop listing anyway (no plans configured)
                const eligibility = await this.canListShop(vendorId);
                if (eligibility.allowed) {
                    return { allowed: true };
                }

                return { 
                    allowed: false, 
                    message: 'An active subscription plan is required for shop slideshow.',
                    subscriptionRequired: true
                };
            }

            const plan = subData.plan;
            if (plan && plan.shopSlideshow) {
                return { allowed: true };
            }

            return { 
                allowed: false, 
                message: 'Shop slideshow is not included in your current plan. Please upgrade to use this feature.' 
            };
        } catch (error) {
            console.error('Error in canUseShopSlideshow:', error);
            return { allowed: false, message: 'Access check failed.' };
        }
    }
}

export default new SubscriptionRulesService();
