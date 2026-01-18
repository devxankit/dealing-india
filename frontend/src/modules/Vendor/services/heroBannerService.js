import api from '../../../shared/utils/api';

/**
 * Get available banner slots for vendors
 * @param {Object} options - { params: { bannerType: 'hero' | 'b2b' } }
 */
export const getAvailableBannerSlots = async (options = {}) => {
  const response = await api.get('/vendor/hero-banners/slots', options);
  return response;
};

/**
 * Get vendor's own banner bookings
 */
export const getMyBannerBookings = async () => {
  const response = await api.get('/vendor/hero-banners/my-bookings');
  return response;
};

/**
 * Get vendor's booking details
 * @param {string} bookingId
 */
export const getVendorBannerBookingDetails = async (bookingId) => {
  const response = await api.get(`/vendor/hero-banners/bookings/${bookingId}`);
  return response;
};

/**
 * Create a new banner booking
 * @param {FormData} formData - Booking data including image
 */
export const createBannerBooking = async (formData) => {
  const response = await api.post('/vendor/hero-banners/book', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

/**
 * Confirm banner booking payment
 * @param {Object} paymentData - { bookingId, transactionId }
 */
export const confirmBannerPayment = async (paymentData) => {
  const response = await api.post('/vendor/hero-banners/confirm-payment', paymentData);
  return response;
};

/**
 * Cancel/Delete an unpaid booking
 * @param {string} bookingId
 */
export const cancelBannerBooking = async (bookingId) => {
  const response = await api.delete(`/vendor/hero-banners/bookings/${bookingId}`);
  return response;
};

/**
 * Get active banners for public display
 * @param {String} bannerType - Optional: 'hero' or 'b2b' to filter by type
 */
export const getActiveBanners = async (bannerType = null) => {
  const params = bannerType ? { bannerType } : {};
  const response = await api.get('/hero-banners/active', { params });
  return response;
};

/**
 * Admin: Get all banner slots and settings
 * @param {Object} options - { params: { bannerType: 'hero' | 'b2b' } }
 */
export const getAdminBannerSlots = async (options = {}) => {
  const response = await api.get('/admin/hero-banners/slots', options);
  return response;
};

/**
 * Admin: Get all banner bookings
 * @param {Object} options - { params: { bannerType: 'hero' | 'b2b' } }
 */
export const getAdminBannerBookings = async (options = {}) => {
  const response = await api.get('/admin/hero-banners/bookings', options);
  return response;
};

/**
 * Admin: Get banner booking details
 * @param {string} bookingId
 */
export const getAdminBannerBookingDetails = async (bookingId) => {
  const response = await api.get(`/admin/hero-banners/bookings/${bookingId}`);
  return response;
};

/**
 * Admin: Update banner settings
 * @param {Object} settings - { universalDisplayTime }
 */
export const updateBannerSettings = async (settings) => {
  const response = await api.put('/admin/hero-banners/settings', settings);
  return response;
};

/**
 * Admin: Update banner slot details
 */
export const updateBannerSlot = async (slotId, slotData) => {
  const response = await api.put(`/admin/hero-banners/slots/${slotId}`, slotData);
  return response;
};

/**
 * Admin: Approve banner booking
 * @param {string} bookingId - Booking ID to approve
 */
export const approveBannerBooking = async (bookingId) => {
  const response = await api.put(`/admin/hero-banners/bookings/${bookingId}/approve`);
  return response;
};

/**
 * Admin: Reject banner booking
 * @param {string} bookingId - Booking ID to reject
 * @param {string} reason - Optional rejection reason
 */
export const rejectBannerBooking = async (bookingId, reason = '') => {
  const response = await api.put(`/admin/hero-banners/bookings/${bookingId}/reject`, { reason });
  return response;
};

/**
 * Admin: Get banner revenue statistics
 * @param {Object} options - { params: { bannerType: 'hero' | 'b2b' } }
 */
export const getBannerRevenueStats = async (options = {}) => {
  const response = await api.get('/admin/hero-banners/revenue-stats', options);
  return response;
};

/**
 * Admin: Get banner transactions for wallet page
 * @param {Object} params - { search, limit, skip, bannerType }
 */
export const getBannerTransactions = async (params = {}) => {
  const response = await api.get('/admin/hero-banners/transactions', { params });
  return response;
};

// --- Mock Data for Testing ---
export const MOCK_BANNERS = [
  {
    id: "banner-1",
    title: "Summer Collection 2026",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=2000",
    link: "https://example.com/summer-collection",
    status: "active",
    vendor: "Fashion Hub",
    slot: 1,
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    amount: 1999,
    impressions: 12500,
    clicks: 450,
    metadata: {
      category: "Apparel",
      targetAudience: "All",
      priority: "high"
    }
  },
  {
    id: "banner-2",
    title: "Flash Sale: Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=2000",
    link: "https://example.com/flash-sale",
    status: "active",
    vendor: "Tech Zone",
    slot: 2,
    startDate: "2026-01-02",
    endDate: "2026-01-15",
    amount: 1499,
    impressions: 8200,
    clicks: 310,
    metadata: {
      category: "Electronics",
      targetAudience: "Tech Enthusiasts",
      priority: "medium"
    }
  },
  {
    id: "banner-3",
    title: "Organic Beauty Products",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=2000",
    link: "https://example.com/organic-beauty",
    status: "pending",
    vendor: "Nature's Care",
    slot: 3,
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    amount: 999,
    impressions: 0,
    clicks: 0,
    metadata: {
      category: "Beauty",
      targetAudience: "Women",
      priority: "low"
    }
  }
];
