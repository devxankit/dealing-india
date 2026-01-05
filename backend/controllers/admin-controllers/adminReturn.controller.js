import returnService from '../../services/return.service.js';
import ReturnPolicyConfig from '../../models/ReturnPolicyConfig.model.js';

export const getAllReturns = async (req, res) => {
    try {
        const { status } = req.query;
        const returns = await returnService.getAdminReturns({ status });

        res.status(200).json({
            success: true,
            data: returns,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateAdminReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, rejectionReason } = req.body;
        const adminId = req.admin.id;

        if (!['approved', 'rejected', 'processing'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status for admin update' });
        }

        const updatedReturn = await returnService.updateStatus(id, status, adminId, 'Admin', note, rejectionReason);

        res.status(200).json({
            success: true,
            message: `Return request status updated to ${status}`,
            data: updatedReturn,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin.id;

        const result = await returnService.processRefund(id, adminId, 'Admin');

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getReturnPolicy = async (req, res) => {
    try {
        const policy = await returnService.getPolicyConfig();
        res.status(200).json({
            success: true,
            data: policy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateReturnPolicy = async (req, res) => {
    try {
        const updates = req.body;
        const adminId = req.admin.id;

        let config = await ReturnPolicyConfig.findOne();
        if (!config) {
            config = new ReturnPolicyConfig();
        }

        Object.assign(config, updates);
        config.updatedBy = adminId;

        await config.save();

        res.status(200).json({
            success: true,
            message: 'Return policy updated',
            data: config,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
