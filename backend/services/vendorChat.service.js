import Chat from '../models/Chat.model.js';
import Message from '../models/Message.model.js';

/**
 * Vendor Chat Service
 * Handles vendor-customer communication
 */
class VendorChatService {
    async getVendorChats(vendorId) {
        return await Chat.find({ vendorId }).populate('userId', 'name email avatar');
    }

    async getChatMessages(chatId) {
        return await Message.find({ chatId }).sort({ createdAt: 1 });
    }
}

export default new VendorChatService();
