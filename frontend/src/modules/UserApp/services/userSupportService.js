import axios from '../../../shared/utils/api';

export const getUserTickets = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await axios.get(`/user/support/tickets?${queryParams}`);
        // Backend returns { success: true, data: { tickets: [...], total, page, ... } }
        return response.data.data || { tickets: [] };
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch tickets';
    }
};

export const getUserTicket = async (ticketId) => {
    try {
        const response = await axios.get(`/user/support/tickets/${ticketId}`);
        // Backend returns { success: true, data: { ticket: {...} } }
        return response.data.data || { ticket: null };
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch ticket';
    }
};

export const createUserTicket = async (ticketData) => {
    try {
        const response = await axios.post('/user/support/tickets', ticketData);
        // Backend returns { success: true, data: { ticket: {...} } }
        return response.data.data || response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to create ticket';
    }
};

export const sendUserTicketMessage = async (ticketId, message) => {
    try {
        const response = await axios.post(`/user/support/tickets/${ticketId}/messages`, { message });
        // Backend returns { success: true, data: { message: {...} } }
        return response.data.data || response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to send message';
    }
};
