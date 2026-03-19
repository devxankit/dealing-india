import vendorAddonService from '../services/vendorAddon.service.js';
import b2bAddonPlanService from '../services/b2bAddonPlan.service.js';
import Vendor from '../models/Vendor.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import BusinessType from '../models/BusinessType.model.js';

class VendorAddonController {
  /**
   * Get all active addon packages available for this specific vendor
   * Considers vendor role (e.g. textile, developer, property-broker)
   * GET /vendor/addons/available
   */
  async getAvailableAddons(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      if (!vendorId) return res.status(401).json({ success: false, message: 'Vendor ID not found' });

      // Identify vendor role for filtering
      const vendor = await Vendor.findById(vendorId).select('businessType businessTypeRef').lean();
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

      let businessTypeId = vendor.businessTypeRef;
      
      // If ref is missing, try to find by name/slug
      if (!businessTypeId && vendor.businessType) {
        const bt = await BusinessType.findOne({ 
          $or: [{ name: vendor.businessType }, { slug: vendor.businessType.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') }] 
        });
        if (bt) businessTypeId = bt._id;
      }

      if (!businessTypeId) {
        return res.status(200).json({ success: true, data: [], message: 'No business type found for vendor' });
      }

      const settings = await BusinessTypeSettings.findOne({ businessTypeId }).populate({
        path: 'allowedAddonPlans',
        match: { isActive: true }
      });

      let availableAddons = settings?.allowedAddonPlans || [];

      const { featureType } = req.query;
      if (featureType) {
        availableAddons = availableAddons.filter(a => a.featureType === featureType);
      }

      res.status(200).json({
        success: true,
        data: availableAddons,
        message: 'Available addon packages fetched successfully'
      });
    } catch (error) {
      console.error('Error in getAvailableAddons controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon package plans'
      });
    }
  }

  /**
   * Initialize addon purchase (Create Razorpay Order)
   * POST /vendor/addons/initialize
   */
  async initializeAddonPurchase(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const { addonPlanId } = req.body;

      if (!addonPlanId) {
        return res.status(400).json({ success: false, message: 'Addon plan ID is required' });
      }

      const orderData = await vendorAddonService.initializeAddonPurchase(vendorId, addonPlanId);

      console.log('Finalizing Addon Purchase Initialization:', {
        orderId: orderData.id,
        amount: orderData.amount,
        hasKey: !!process.env.RAZORPAY_KEY_ID
      });
 
      res.status(200).json({
        success: true,
        data: {
          order: orderData,
          key: process.env.RAZORPAY_KEY_ID
        },
        message: 'Addon purchase initialized'
      });
    } catch (error) {
      console.error('Error in initializeAddonPurchase controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize addon purchase'
      });
    }
  }

  /**
   * Verify addon payment and credit units
   * POST /vendor/addons/verify
   */
  async verifyAddonPayment(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const paymentData = req.body;

      if (!paymentData.razorpayOrderId || !paymentData.razorpayPaymentId || !paymentData.razorpaySignature) {
        return res.status(400).json({ success: false, message: 'All payment verification details required' });
      }

      const addonRecord = await vendorAddonService.verifyAddonPayment(vendorId, paymentData);

      res.status(200).json({
        success: true,
        data: addonRecord,
        message: 'Addon units credited to your account successfully'
      });
    } catch (error) {
      console.error('Error in verifyAddonPayment controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify addon payment'
      });
    }
  }
 
  /**
   * Get recent addon purchase history
   * GET /vendor/addons/history
   */
  async getRecentAddons(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const history = await vendorAddonService.getRecentAddons(vendorId);
      res.status(200).json({
        success: true,
        data: history,
        message: 'Addon history fetched successfully'
      });
    } catch (error) {
      console.error('Error in getRecentAddons controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon history'
      });
    }
  }

  /**
   * Get vendor's current addon status/limits
   * GET /vendor/addons/status
   */
  async getMyAddonsStatus(req, res) {
    try {
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;

      const [reelsQuota, productsQuota, lotSlotQuota] = await Promise.all([
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'reels'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'products'),
        vendorAddonService.getTotalAvailableAddonUnits(vendorId, 'lot_slot'),
      ]);

      res.status(200).json({
        success: true,
        data: [
          { _id: 'reels', totalAvailable: reelsQuota || 0 },
          { _id: 'products', totalAvailable: productsQuota || 0 },
          { _id: 'lot_slot', totalAvailable: lotSlotQuota || 0 }
        ],
        message: 'Addon quotas fetched successfully'
      });
    } catch (error) {
      console.error('Error in getMyAddonsStatus controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon quotas'
      });
    }
  }
}

export default new VendorAddonController();
