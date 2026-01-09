import axiosInstance from '../utils/api';
import { API_BASE_URL as API_URL } from '../utils/constants';

// User API
export const checkReturnEligibility = async (orderId) => {
    try {
        // axiosInstance interceptor already returns response.data
        // which is { success: true, data: { eligible: true/false } }
        const response = await axiosInstance.get(`/user/returns/eligibility/${orderId}`);
        // Return the data portion directly: { eligible: true/false }
        return response.data || response;
    } catch (error) {
        throw error;
    }
};

export const createReturnRequest = async (returnData) => {
    try {
        // axiosInstance interceptor already returns response.data
        // which is { success: true, message: '...', data: returnRequest }
        const response = await axiosInstance.post(`/user/returns`, returnData);
        // Return full response so component can check response.success
        return response;
    } catch (error) {
        throw error;
    }
};

export const getUserReturns = async (status) => {
    try {
        const query = status ? `?status=${status}` : '';
        const response = await axiosInstance.get(`/user/returns${query}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Vendor API
export const getVendorReturns = async (status) => {
    try {
        const query = status ? `?status=${status}` : '';
        const response = await axiosInstance.get(`/vendor/returns${query}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateReturnStatusVendor = async (id, data) => {
    try {
        const response = await axiosInstance.put(`/vendor/returns/${id}/status`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Mark return as received - triggers refund to customer wallet
 * @param {string} id - Return request ID
 * @param {string} note - Optional note
 */
export const markReturnAsReceived = async (id, note = '') => {
    try {
        const response = await axiosInstance.put(`/vendor/returns/${id}/received`, { note });
        return response;
    } catch (error) {
        throw error;
    }
};

// Admin API
export const getAdminReturns = async (status) => {
    try {
        const query = status ? `?status=${status}` : '';
        const response = await axiosInstance.get(`/admin/returns${query}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateReturnStatusAdmin = async (id, data) => {
    try {
        const response = await axiosInstance.put(`/admin/returns/${id}/status`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const processRefundAdmin = async (id) => {
    try {
        const response = await axiosInstance.put(`/admin/returns/${id}/refund`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getReturnPolicy = async () => {
    try {
        const response = await axiosInstance.get(`/admin/returns/policy`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateReturnPolicy = async (data) => {
    try {
        const response = await axiosInstance.put(`/admin/returns/policy`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const forceDeleteReturnAdmin = async (orderId) => {
    try {
        const response = await axiosInstance.delete(`/admin/returns/force-delete/${orderId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
