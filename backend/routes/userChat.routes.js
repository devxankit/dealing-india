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
// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.error('[Multer] Upload error:', {
            code: err.code,
            message: err.message,
            field: err.field,
            name: err.name
        });
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 10MB.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field name. Use "file" as the field name.'
            });
        }
        if (err.message) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + (err.message || 'Unknown error')
        });
    }
    next();
};

// Upload route with comprehensive error handling
router.post('/upload', (req, res, next) => {
    // Use multer middleware
    uploadChatFile.single('file')(req, res, async (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        
        // Call controller with proper error handling
        try {
            await ChatController.uploadAttachment(req, res, next);
        } catch (controllerError) {
            console.error('[Route] Controller error:', {
                message: controllerError.message,
                stack: controllerError.stack,
                name: controllerError.name
            });
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: controllerError.message || 'Internal server error'
                });
            }
        }
    });
});
router.get('/inquiries/check/:productId', ChatController.checkInquiryForProduct);

export default router;
