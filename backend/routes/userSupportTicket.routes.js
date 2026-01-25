import express from 'express';
import UserSupportTicketController from '../controllers/user-controllers/supportTicket.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import redisService from '../services/redis.service.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate);
router.use(authorize('user'));

router.post('/', UserSupportTicketController.createTicket);
router.get('/', redisService.cacheMiddleware('user:tickets:list', 300), UserSupportTicketController.getTickets);
router.get('/:id', redisService.cacheMiddleware('user:tickets:details', 300), UserSupportTicketController.getTicket);
router.post('/:id/reply', UserSupportTicketController.replyToTicket);

export default router;

