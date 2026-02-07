import B2BSubscriptionPlan from '../models/B2BSubscriptionPlan.model.js';
import BusinessType from '../models/BusinessType.model.js';
import BusinessTypeSettings from '../models/BusinessTypeSettings.model.js';
import razorpayService from './razorpay.service.js';

class B2BSubscriptionPlanService {
  /**
   * Get all B2B subscription plans
   * @param {Object} options - Query options
   * @param {Boolean} options.includeInactive - Include inactive plans
   * @returns {Promise<Array>} Array of plans
   */
  async getAllPlans(options = {}) {
    try {
      const { includeInactive = false, businessType = null } = options;
      const query = {};

      if (!includeInactive) {
        query.isActive = true;
      }

      if (businessType) {
        // 1. Existing logic: Filter by plans that explicitly allow this type or are global
        query.$or = [
          { allowedBusinessTypes: { $size: 0 } },
          { allowedBusinessTypes: { $exists: false } },
          { allowedBusinessTypes: businessType }
        ];

        // 2. NEW Logic: Check if BusinessTypeSettings HAS explicitly allowed plans for this type
        const bType = await BusinessType.findOne({ slug: businessType });
        if (bType) {
          const settings = await BusinessTypeSettings.findOne({ businessTypeId: bType._id });
          if (settings && settings.allowedPlans && settings.allowedPlans.length > 0) {
            // If admin has explicitly picked plans in the Config UI, ONLY those plans should show
            // This overrides the 'allowedBusinessTypes' on the plan itself for THIS specific business type
            delete query.$or; // Remove the broad OR query
            query._id = { $in: settings.allowedPlans };
          }
        }
      }

      const plans = await B2BSubscriptionPlan.find(query)
        .sort({ duration: 1 }) // Sort by duration: 3, 6, 12
        .select('-__v')
        .lean();

      return plans;
    } catch (error) {
      throw new Error(`Failed to fetch B2B subscription plans: ${error.message}`);
    }
  }

  /**
   * Get active B2B subscription plans only
   * @returns {Promise<Array>} Array of active plans
   */
  async getActivePlans() {
    return this.getAllPlans({ includeInactive: false });
  }

  /**
   * Get plan by ID
   * @param {String} planId - Plan ID
   * @returns {Promise<Object|null>} Plan object or null
   */
  async getPlanById(planId) {
    try {
      const plan = await B2BSubscriptionPlan.findById(planId)
        .select('-__v')
        .lean();

      if (!plan) {
        throw new Error('B2B subscription plan not found');
      }

      return plan;
    } catch (error) {
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
  }

  /**
   * Get plan by duration
   * @param {Number} duration - Duration in months (3, 6, or 12)
   * @returns {Promise<Object|null>} Plan object or null
   */
  async getPlanByDuration(duration) {
    try {
      const plan = await B2BSubscriptionPlan.findOne({ duration, isActive: true })
        .select('-__v')
        .lean();

      return plan;
    } catch (error) {
      throw new Error(`Failed to fetch plan by duration: ${error.message}`);
    }
  }

  /**
   * Create a new B2B subscription plan
   * @param {Object} planData - Plan data
   * @param {String} planData.name - Plan name
   * @param {Number} planData.duration - Duration in months (3, 6, or 12)
   * @param {Number} planData.price - Plan price
   * @param {Array<String>} planData.features - Array of features
   * @param {String} createdBy - Admin ID who created the plan
   * @returns {Promise<Object>} Created plan
   */
  async createPlan(planData, createdBy) {
    try {
      const { name, duration, price, features = [], description } = planData;

      // Validate duration
      if (![3, 6, 12].includes(duration)) {
        throw new Error('Duration must be 3, 6, or 12 months');
      }

      /*
      // Check if plan with this duration already exists
      const existingPlan = await B2BSubscriptionPlan.findOne({ duration });
      if (existingPlan) {
        throw new Error(`A plan with ${duration} months duration already exists`);
      }
      */

      const planToCreate = {
        name: name.trim(),
        duration,
        price,
        features: features.filter(f => f && f.trim()), // Remove empty features
        description: description?.trim(),
        isActive: true,
      };

      if (createdBy) {
        planToCreate.createdBy = createdBy;
        planToCreate.updatedBy = createdBy;
      }

      const plan = await B2BSubscriptionPlan.create(planToCreate);

      return plan.toObject();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(`A plan with ${planData.duration} months duration already exists`);
      }
      throw new Error(`Failed to create plan: ${error.message}`);
    }
  }

  /**
   * Update an existing B2B subscription plan
   * @param {String} planId - Plan ID
   * @param {Object} updateData - Data to update
   * @param {String} updatedBy - Admin ID who updated the plan
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updateData, updatedBy) {
    try {
      const { name, price, features, description, isActive } = updateData;

      const plan = await B2BSubscriptionPlan.findById(planId);
      if (!plan) {
        throw new Error('B2B subscription plan not found');
      }

      // 🔹 Detect critical changes
      const isPriceChanged =
        price !== undefined && price !== plan.price;

      const isNameChanged =
        name !== undefined && name.trim() !== plan.name;

      const newPrice = price !== undefined ? price : plan.price;

      /**
       * 🔹 Rule:
       * - price OR name change ho
       * - aur plan paid ho (> 0)
       * → naya Razorpay plan create karo
       */
      if ((isPriceChanged || isNameChanged) && newPrice > 0) {
        const planName = name?.trim() || plan.name;
        const planDescription =
          description?.trim() ||
          plan.description ||
          `Monthly subscription for ${planName}`;

        try {
          const razorpayPlan = await razorpayService.createPlan({
            name: planName,
            amount: newPrice,
            currency: 'INR',
            period: 'monthly',
            interval: 1,
            description: planDescription,
          });

          updateData.razorpayPlanId = razorpayPlan.id;
        } catch (err) {
          console.error('Razorpay plan creation failed:', err);
          throw new Error('Could not create Razorpay plan');
        }
      }

      // 🔹 Free plan case
      if (newPrice === 0) {
        updateData.razorpayPlanId = null;
      }

      // 🔹 Update DB fields
      if (name !== undefined) plan.name = name.trim();
      if (price !== undefined) plan.price = price;

      if (features !== undefined) {
        plan.features = features.filter(f => f?.trim());
      }

      if (description !== undefined) {
        plan.description = description.trim();
      }

      if (isActive !== undefined) plan.isActive = isActive;
      if (updatedBy) plan.updatedBy = updatedBy;

      if (updateData.razorpayPlanId !== undefined) {
        plan.razorpayPlanId = updateData.razorpayPlanId;
      }

      await plan.save();
      return plan.toObject();

    } catch (error) {
      throw new Error(`Failed to update plan: ${error.message}`);
    }
  }


  /**
   * Delete a plan (soft delete by setting isActive to false)
   * @param {String} planId - Plan ID
   * @param {String} updatedBy - Admin ID who deleted the plan
   * @returns {Promise<Object>} Deleted plan
   */
  async deletePlan(planId, updatedBy) {
    try {
      const plan = await this.updatePlan(planId, { isActive: false }, updatedBy);
      return plan;
    } catch (error) {
      throw new Error(`Failed to delete plan: ${error.message}`);
    }
  }

  /**
   * Ensure default plans exist (3, 6, 12 months)
   * @param {String} createdBy - Admin ID
   * @returns {Promise<Array>} Array of all plans
   */
  async ensureDefaultPlans(createdBy) {
    try {
      const defaultPlans = [
        {
          name: '3 Months Plan',
          duration: 3,
          price: 9999,
          features: [
            'Unlimited Product Listings',
            'Inquiry Management',
            'Chat Support',
            'Basic Analytics',
            'Standard Visibility'
          ],
        },
        {
          name: '6 Months Plan',
          duration: 6,
          price: 18999,
          features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management'
          ],
        },
        {
          name: '12 Months Plan',
          duration: 12,
          price: 34999,
          features: [
            'Unlimited Product Listings',
            'Priority Inquiry Display',
            'Advanced Analytics',
            'Featured Store Badge',
            '24/7 Dedicated Support',
            'Bulk Order Management',
            'Custom API Integration',
            'Personal Account Manager'
          ],
        },
      ];

      const existingPlans = await this.getAllPlans({ includeInactive: true });
      const existingDurations = existingPlans.map(p => p.duration);

      for (const defaultPlan of defaultPlans) {
        if (!existingDurations.includes(defaultPlan.duration)) {
          await this.createPlan(defaultPlan, createdBy);
        }
      }

      return this.getAllPlans({ includeInactive: false });
    } catch (error) {
      throw new Error(`Failed to ensure default plans: ${error.message}`);
    }
  }
}

export default new B2BSubscriptionPlanService();
