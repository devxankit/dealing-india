import express from 'express';
import VendorChatController from '../controllers/vendor-controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { uploadChatFile } from '../utils/upload.util.js';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

router.post('/conversations', VendorChatController.createOrGetConversation);
router.get('/conversations', VendorChatController.getConversations);
router.get('/conversations/:id/messages', VendorChatController.getMessages);
router.post('/messages', VendorChatController.sendMessage);
router.put('/messages/:id/read', VendorChatController.markMessageAsRead);
router.put('/conversations/:id/read-all', VendorChatController.markAllAsRead);
router.post('/upload', uploadChatFile.single('file'), VendorChatController.uploadAttachment);

export default router;

