import VendorAddon from '../models/VendorAddon.model.js';
import B2BAddonPlan from '../models/B2BAddonPlan.model.js';
import Vendor from '../models/Vendor.model.js';
import razorpayService from './razorpay.service.js';
import mongoose from 'mongoose';

class VendorAddonService {
  /**
   * Get all active add-ons for a vendor by feature type
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type (reels, products, lot_slot)
   * @returns {Promise<Array>} List of active add-on records
   */
  async getActiveAddons(vendorId, featureType) {
    try {
      const addons = await VendorAddon.find({
        vendorId,
        featureType,
        status: 'active',
        $expr: { $lt: ['$usedCount', '$totalQuantity'] }
      })
        .sort({ createdAt: 1 }) // First bought, first used
        .lean();
      return addons;
    } catch (error) {
      console.error('Error fetching active vendor addons:', error);
      throw error;
    }
  }

  /**
   * Get total available units for a feature type from all active add-ons
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type
   * @returns {Promise<number>} Total units remaining
   */
  async getTotalAvailableAddonUnits(vendorId, featureType) {
    try {
      const addons = await VendorAddon.aggregate([
        {
          $match: {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            featureType,
            status: 'active',
          }
        },
        {
          $project: {
            remaining: { $subtract: ['$totalQuantity', '$usedCount'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRemaining: { $sum: '$remaining' }
          }
        }
      ]);

      return addons.length > 0 ? Math.max(0, addons[0].totalRemaining) : 0;
    } catch (error) {
      console.error('Error in getTotalAvailableAddonUnits:', error);
      return 0;
    }
  }
 
  /**
   * Get recent addon purchases for a vendor
   * @param {string} vendorId 
   * @param {number} limit 
   */
  async getRecentAddons(vendorId, limit = 5) {
    return await VendorAddon.find({ vendorId })
      .populate('addonPlanId', 'name price featureType quantity')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Initialize addon purchase (Create Razorpay Order)
   * @param {string} vendorId - Vendor ID
   * @param {string} addonPlanId - ID of the addon package
   * @returns {Promise<Object>} Razorpay order data
   */
  async initializeAddonPurchase(vendorId, addonPlanId) {
    try {
      const addonPlan = await B2BAddonPlan.findById(addonPlanId);
      if (!addonPlan || !addonPlan.isActive) {
        throw new Error('Invalid or inactive add-on plan');
      }

      const receiptId = `addon_${Date.now()}_${vendorId.toString().slice(-4)}`;

      const razorpayOrder = await razorpayService.createOrder(
        addonPlan.price,
        'INR',
        receiptId,
        {
          vendorId: vendorId.toString(),
          addonPlanId: addonPlanId.toString(),
          featureType: addonPlan.featureType,
          quantity: addonPlan.quantity,
          type: 'b2b_addon'
        }
      );

      return {
        ...razorpayOrder,
        addonPlanId: addonPlan._id,
        price: addonPlan.price,
        quantity: addonPlan.quantity,
        featureType: addonPlan.featureType,
        name: addonPlan.name
      };
    } catch (error) {
      console.error('Initialize Addon Purchase Error:', error);
      throw error;
    }
  }

  /**
   * Verify addon payment and credit units
   * @param {string} vendorId - Vendor ID
   * @param {Object} paymentData - Razorpay payment response
   * @returns {Promise<Object>} Created addon record
   */
  async verifyAddonPayment(vendorId, paymentData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
      const addonPlanId = paymentData.addonPlanId || paymentData.planId;

      // 1. Verify Signature
      const isValid = razorpayService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) throw new Error('Add-on payment verification failed');

      // 2. Prevent Duplicate Credit
      const existing = await VendorAddon.findOne({ paymentId: razorpayPaymentId }).session(session);
      if (existing) {
        await session.commitTransaction();
        return existing;
      }

      // 3. Get Plan Details
      const addonPlan = await B2BAddonPlan.findById(addonPlanId).session(session);
      if (!addonPlan) throw new Error('Add-on plan not found');

      // 4. Create VendorAddon Record
      const [vendorAddon] = await VendorAddon.create([{
        vendorId,
        addonPlanId,
        featureType: addonPlan.featureType,
        totalQuantity: addonPlan.quantity,
        usedCount: 0,
        purchaseDate: new Date(),
        status: 'active',
        paymentId: razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature
      }], { session });

      await session.commitTransaction();
      return vendorAddon;
    } catch (error) {
      await session.abortTransaction();
      console.error('Verify Addon Payment Error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Consume one unit of a specific feature
   * Checks for active addons and decrements quantity
   * @param {string} vendorId - Vendor ID
   * @param {string} featureType - Feature type to consume
   * @returns {Promise<boolean>} True if successful
   */
  async consumeAddonUnit(vendorId, featureType) {
    try {
      // Find the oldest active addon that has capacity
      const addon = await VendorAddon.findOne({
        vendorId,
        featureType,
        status: 'active',
        $expr: { $lt: ['$usedCount', '$totalQuantity'] }
      }).sort({ createdAt: 1 });

      if (!addon) return false;

      addon.usedCount += 1;
      if (addon.usedCount >= addon.totalQuantity) {
        addon.status = 'consumed';
      }

      await addon.save();
      return true;
    } catch (error) {
      console.error(`Error consuming ${featureType} addon unit for vendor ${vendorId}:`, error);
      return false;
    }
  }
}

export default new VendorAddonService();
