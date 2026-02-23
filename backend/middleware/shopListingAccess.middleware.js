import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';

/**
 * Middleware to check if Shop Listing module is enabled for the vendor's business type.
 * Checks enabledModules array for 'shop-listing'. If not present, blocks access to shop unit APIs.
 * 
 * Prereq: protectVendor middleware must run before this.
 */
export const checkShopListingAccess = async (req, res, next) => {
    try {
        // Use req.userDoc from auth middleware, or fallback to a fresh lookup
        const vendor = req.userDoc || await Vendor.findById(req.user?.vendorId).lean();
        if (!vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // If vendor has no businessTypeRef, allow access by default
        if (!vendor.businessTypeRef) {
            return next();
        }

        const settings = await BusinessTypeSettings.findOne({ businessTypeId: vendor.businessTypeRef }).lean();

        if (!settings) {
            // If no settings found, allow access by default
            return next();
        }

        // Check if 'shop-listing' is in enabledModules
        const isShopListingEnabled = settings.enabledModules && settings.enabledModules.includes('shop-listing');

        if (!isShopListingEnabled) {
            return res.status(403).json({
                success: false,
                message: 'Shop Listing module is currently disabled by the administrator.'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking shop listing access:', error);
        next(error);
    }
};
