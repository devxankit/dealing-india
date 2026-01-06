import returnService from '../../services/return.service.js';

export const createReturnRequest = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const returnData = req.body;

        const returnRequest = await returnService.createReturnRequest(userId, returnData);

        res.status(201).json({
            success: true,
            message: 'Return request submitted successfully',
            data: returnRequest,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getUserReturns = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        console.log('API: getUserReturns userId:', userId);
        const { status } = req.query;

        const returns = await returnService.getUserReturns(userId, { status });
        console.log('API: getUserReturns found:', returns.length);

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

export const getReturnEligibility = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId || req.user.id;

        const eligibility = await returnService.checkEligibility(orderId, userId);

        res.status(200).json({
            success: true,
            data: eligibility,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
