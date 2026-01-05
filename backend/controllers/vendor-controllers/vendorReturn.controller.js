import returnService from '../../services/return.service.js';

export const getVendorReturns = async (req, res) => {
    try {
        const vendorId = req.user.vendorId;
        const { status } = req.query;

        const returns = await returnService.getVendorReturns(vendorId, { status });

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

export const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, rejectionReason } = req.body;
        const vendorId = req.user.vendorId;

        // We should probably verify this return belongs to this vendor first
        // returnService handles update logic but not ownership check inside updateStatus explicitly for 'actor', 
        // relying on caller. But wait, updateStatus just takes actor info.
        // Ideally we should check if req.vendor.id matches returnRequest.vendorId
        // For now, relying on trust or adding check here.

        const returns = await returnService.getVendorReturns(vendorId); // Inefficient but simple check
        const isOwner = returns.some(r => r._id.toString() === id);

        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this return request' });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status for vendor update' });
        }

        const updatedReturn = await returnService.updateStatus(id, status, vendorId, 'Vendor', note, rejectionReason);

        res.status(200).json({
            success: true,
            message: `Return request ${status}`,
            data: updatedReturn,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
