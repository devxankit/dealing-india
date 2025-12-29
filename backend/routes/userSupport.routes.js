import express from 'express';
import {
    getUserTicketsController,
    getUserTicketController,
    createUserTicketController,
    sendUserTicketMessageController,
} from '../controllers/user-controllers/userSupport.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/tickets', asyncHandler(getUserTicketsController));
router.get('/tickets/:id', asyncHandler(getUserTicketController));
router.post('/tickets', asyncHandler(createUserTicketController));
router.post('/tickets/:id/messages', asyncHandler(sendUserTicketMessageController));

export default router;
