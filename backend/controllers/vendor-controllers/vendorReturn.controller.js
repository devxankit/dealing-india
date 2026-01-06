import returnService from '../../services/return.service.js';

export const getVendorReturns = async (req, res) => {
    try {
        // Robust ID extraction:
        // 1. try req.user.vendorId (from token payload if named so)
        // 2. try req.user.id (standard jwt subject)
        // 3. try req.user.userId (common variation)
        // 4. try req.user._id (if user object)
        const vendorId = req.user.vendorId || req.user.id || req.user.userId || req.user._id;

        console.log('Fetching returns for Vendor ID:', vendorId);

        if (!vendorId) {
            console.error('Vendor ID missing from request user:', req.user);
            return res.status(401).json({ success: false, message: 'Vendor ID could not be determined' });
        }

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

        if (!['approved', 'rejected', 'processing', 'completed'].includes(status)) {
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
