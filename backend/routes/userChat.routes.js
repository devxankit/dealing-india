import express from 'express';
import UserChatController from '../controllers/user-controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate);
router.use(authorize('user'));

router.post('/conversations', UserChatController.createOrGetConversation);
router.get('/conversations', UserChatController.getConversations);
router.get('/conversations/:id/messages', UserChatController.getMessages);
router.post('/messages', UserChatController.sendMessage);
router.put('/messages/:id/read', UserChatController.markMessageAsRead);
router.put('/conversations/:id/read-all', UserChatController.markAllAsRead);

export default router;

