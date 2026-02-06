import Order from '../../models/Order.model.js';

export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find().populate('customerId', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('customerId', 'name email phone');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

export const updateStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.status = status;
        order.statusHistory.push({
            status,
            changedBy: req.user.id,
            changedByRole: 'admin',
            note: note || `Admin updated status to ${status}`
        });

        await order.save();
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.status = 'cancelled';
        order.cancellation = {
            cancelledAt: new Date(),
            cancelledBy: req.user.id,
            cancelledByRole: 'admin',
            reason
        };
        order.statusHistory.push({
            status: 'cancelled',
            changedBy: req.user.id,
            changedByRole: 'admin',
            note: reason || 'Cancelled by admin'
        });

        await order.save();
        res.status(200).json({ success: true, message: 'Order cancelled' });
    } catch (error) {
        next(error);
    }
};

export const processRefund = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        res.status(200).json({ success: true, message: 'Refund processing placeholder' });
    } catch (error) {
        next(error);
    }
};

export const getStats = async (req, res, next) => {
    try {
        const stats = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};
