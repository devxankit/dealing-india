import express from 'express';
import UserSupportTicketController from '../controllers/user-controllers/supportTicket.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate);
router.use(authorize('user'));

router.post('/', UserSupportTicketController.createTicket);
router.get('/', UserSupportTicketController.getTickets);
router.get('/:id', UserSupportTicketController.getTicket);
router.post('/:id/reply', UserSupportTicketController.replyToTicket);

export default router;

