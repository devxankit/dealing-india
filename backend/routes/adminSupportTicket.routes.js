import express from 'express';
import AdminSupportTicketController from '../controllers/admin-controllers/supportTicket.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', AdminSupportTicketController.getStats);
router.get('/', AdminSupportTicketController.getAllTickets);
router.get('/:id', AdminSupportTicketController.getTicket);
router.post('/:id/respond', AdminSupportTicketController.respondToTicket);
router.patch('/:id/status', AdminSupportTicketController.updateStatus);

export default router;

