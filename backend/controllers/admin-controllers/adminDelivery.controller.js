import DeliveryRule from '../../models/DeliveryRule.model.js';

/**
 * Get all delivery rules
 * GET /api/admin/delivery-rules
 */
export const getDeliveryRules = async (req, res, next) => {
    try {
        const rules = await DeliveryRule.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: rules,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single delivery rule
 * GET /api/admin/delivery-rules/:id
 */
export const getDeliveryRuleById = async (req, res, next) => {
    try {
        const rule = await DeliveryRule.findById(req.params.id);
        if (!rule) {
            const error = new Error('Delivery rule not found');
            error.status = 404;
            throw error;
        }
        res.status(200).json({
            success: true,
            data: rule,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new delivery rule
 * POST /api/admin/delivery-rules
 */
export const createDeliveryRule = async (req, res, next) => {
    try {
        const { name, isDefault } = req.body;

        // Check if name exists
        const existingRule = await DeliveryRule.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingRule) {
            const error = new Error('A rule with this name already exists');
            error.status = 400;
            throw error;
        }

        // If setting as default, unset others
        if (isDefault) {
            await DeliveryRule.updateMany({ isDefault: true }, { isDefault: false });
        }

        const rule = await DeliveryRule.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Delivery rule created successfully',
            data: rule,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update delivery rule
 * PUT /api/admin/delivery-rules/:id
 */
export const updateDeliveryRule = async (req, res, next) => {
    try {
        const { isDefault } = req.body;

        // If setting as default, unset others first
        if (isDefault) {
            await DeliveryRule.updateMany({ _id: { $ne: req.params.id }, isDefault: true }, { isDefault: false });
        }

        const rule = await DeliveryRule.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!rule) {
            const error = new Error('Delivery rule not found');
            error.status = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: 'Delivery rule updated successfully',
            data: rule,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete delivery rule
 * DELETE /api/admin/delivery-rules/:id
 */
export const deleteDeliveryRule = async (req, res, next) => {
    try {
        const rule = await DeliveryRule.findById(req.params.id);
        if (!rule) {
            const error = new Error('Delivery rule not found');
            error.status = 404;
            throw error;
        }

        if (rule.isDefault) {
            const error = new Error('Cannot delete the default delivery rule. Please assign another default first.');
            error.status = 400;
            throw error;
        }

        // Optional: Check if assigned to vendors and prevent delete or unassign
        // For now, let's proceed with delete, vendor fallback logic in delivery service handles null rules.

        await rule.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Delivery rule deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
