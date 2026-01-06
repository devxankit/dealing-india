import express from 'express';
import VendorSupportTicketController from '../controllers/vendor-controllers/supportTicket.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

router.post('/', VendorSupportTicketController.createTicket);
router.get('/', VendorSupportTicketController.getTickets);
router.get('/:id', VendorSupportTicketController.getTicket);
router.patch('/:id/status', VendorSupportTicketController.updateStatus);
router.post('/:id/reply', VendorSupportTicketController.replyToTicket);

export default router;

