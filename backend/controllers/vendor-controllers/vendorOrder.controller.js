import * as vendorOrdersService from '../../services/vendorOrders.service.js';
import Order from '../../models/Order.model.js';

export const getOrders = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const orders = await vendorOrdersService.getAllVendorOrdersTransformed(vendorId);
        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const vendorId = req.user?.vendorId || req.user?.id;
        const order = await Order.findOne({
            _id: orderId,
            'vendorBreakdown.vendorId': vendorId
        }).populate('customerId', 'name email phone');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

export const updateStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body;
        const vendorId = req.user?.vendorId || req.user?.id;

        const order = await Order.findOne({
            _id: orderId,
            'vendorBreakdown.vendorId': vendorId
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            changedBy: vendorId,
            changedByRole: 'vendor',
            note: note || `Status updated to ${status}`
        });

        await order.save();
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

export const getStats = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        const stats = await vendorOrdersService.getVendorOrderStats(vendorId);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

export const getEarningsStats = async (req, res, next) => {
    try {
        const vendorId = req.user?.vendorId || req.user?.id;
        // Basic implementation for recovery
        res.status(200).json({ success: true, data: { earnings: 0 } });
    } catch (error) {
        next(error);
    }
};
