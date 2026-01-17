import express from 'express';
import ChatController from '../controllers/user-controllers/chat.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadChatFile } from '../utils/upload.util.js';

const router = express.Router();

// All routes require user authentication
router.use(authenticate);
router.use(authorize('user'));

router.post('/conversations', ChatController.createOrGetConversation);
router.get('/conversations', ChatController.getConversations);
router.get('/conversations/:id/messages', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);
router.put('/messages/:id/read', ChatController.markMessageAsRead);
router.put('/conversations/:id/read-all', ChatController.markAllAsRead);
router.post('/upload', uploadChatFile.single('file'), ChatController.uploadAttachment);
router.get('/inquiries/check/:productId', ChatController.checkInquiryForProduct);

export default router;
