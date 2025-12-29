import axios from '../../../shared/utils/api';

export const getUserTickets = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await axios.get(`/user/support/tickets?${queryParams}`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch tickets';
    }
};

export const getUserTicket = async (ticketId) => {
    try {
        const response = await axios.get(`/user/support/tickets/${ticketId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to fetch ticket';
    }
};

export const createUserTicket = async (ticketData) => {
    try {
        const response = await axios.post('/user/support/tickets', ticketData);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to create ticket';
    }
};

export const sendUserTicketMessage = async (ticketId, message) => {
    try {
        const response = await axios.post(`/user/support/tickets/${ticketId}/messages`, { message });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Failed to send message';
    }
};
