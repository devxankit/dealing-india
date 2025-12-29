import {
    getUserTickets,
    getUserTicketById,
    createUserTicket,
    addUserMessageToTicket,
} from '../../services/userSupport.service.js';

export const getUserTicketsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const {
            search,
            status,
            priority,
            page,
            limit,
            sortBy,
            sortOrder,
        } = req.query;

        const result = await getUserTickets(userId, {
            search,
            status,
            priority,
            page,
            limit,
            sortBy,
            sortOrder,
        });

        res.status(200).json({
            success: true,
            message: 'Tickets retrieved successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getUserTicketController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const ticket = await getUserTicketById(id, userId);

        res.status(200).json({
            success: true,
            message: 'Ticket retrieved successfully',
            data: { ticket },
        });
    } catch (error) {
        next(error);
    }
};

export const createUserTicketController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { subject, type, priority, description, vendorId } = req.body;

        if (!subject || !description || !type) {
            return res.status(400).json({
                success: false,
                message: 'Subject, Description and Type are required',
            });
        }

        const ticket = await createUserTicket(userId, {
            subject,
            type,
            priority,
            description,
            vendorId
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: { ticket },
        });
    } catch (error) {
        next(error);
    }
};

export const sendUserTicketMessageController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required',
            });
        }

        const newMessage = await addUserMessageToTicket(id, userId, message);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message: newMessage },
        });
    } catch (error) {
        next(error);
    }
};
