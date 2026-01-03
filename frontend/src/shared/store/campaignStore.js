import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Helper function to generate URL-friendly slug (for frontend use)
export const generateSlug = (name, existingCampaigns = []) => {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  let uniqueSlug = slug;
  let counter = 1;
  while (existingCampaigns.some((c) => c.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

export const useCampaignStore = create(
  persist(
    (set, get) => ({
      campaigns: [],
      publicCampaigns: [], // Separate store for public campaigns
      isLoading: false,
      isPublicLoading: false,
      lastPublicFetch: null, // Track when campaigns were last fetched
      publicFetchPromise: null, // Track ongoing fetch to avoid duplicate simultaneous requests

  // Initialize campaigns from API (admin endpoint)
  initialize: async (filters = {}) => {
    set({ isLoading: true });
    try {
      // Default to fetching all campaigns (limit 100) if no limit specified
      const { type, page = 1, limit = filters.limit || 100 } = filters;
      const response = await api.get('/admin/offers', {
        params: { type, page, limit },
      });

      if (response.success && response.data) {
        set({ campaigns: response.data.campaigns || [], isLoading: false });
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch campaigns');
    } catch (error) {
      set({ isLoading: false, campaigns: [] });
      console.error('Failed to initialize campaigns:', error);
      return { campaigns: [], total: 0, page: 1, limit: 100, totalPages: 0 };
    }
  },

  // Initialize public campaigns from API (public endpoint)
  initializePublic: async (filters = {}, forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
    
    // If there's an ongoing request, return that promise to avoid duplicate simultaneous requests
    if (state.publicFetchPromise) {
      console.log('campaignStore - Joining existing public fetch request');
      return state.publicFetchPromise;
    }

    // Use cached data if available and not forcing refresh
    if (!forceRefresh && state.publicCampaigns && state.publicCampaigns.length > 0 && state.lastPublicFetch) {
      const timeSinceLastFetch = now - state.lastPublicFetch;
      if (timeSinceLastFetch < CACHE_DURATION) {
        console.log('campaignStore - Using cached public campaigns');
        return { campaigns: state.publicCampaigns, total: state.publicCampaigns.length, page: 1, limit: 100, totalPages: 1 };
      }
    }

    const fetchPromise = (async () => {
      set({ isPublicLoading: true });
      try {
        const { type, page = 1, limit = filters.limit || 100 } = filters;
        console.log(`campaignStore - Fetching public campaigns: type=${type}, page=${page}, limit=${limit}`);
        
        const response = await api.get('/campaigns', {
          params: { type, page, limit },
        });

        console.log('campaignStore - Received response:', response);

        if (response.success && response.data) {
          const campaigns = response.data.campaigns || [];
          set({ 
            publicCampaigns: campaigns, 
            isPublicLoading: false,
            lastPublicFetch: Date.now(),
            publicFetchPromise: null 
          });
          return response.data;
        }
        throw new Error(response.message || 'Failed to fetch campaigns');
      } catch (error) {
        set({ isPublicLoading: false, publicFetchPromise: null });
        console.error('Failed to initialize public campaigns:', error);
        const cachedCampaigns = get().publicCampaigns;
        return { 
          campaigns: cachedCampaigns || [], 
          total: cachedCampaigns?.length || 0, 
          page: 1, 
          limit: 100, 
          totalPages: 0 
        };
      }
    })();

    set({ publicFetchPromise: fetchPromise });
    return fetchPromise;
  },

  // Get all campaigns
  getCampaigns: () => {
    return get().campaigns;
  },

  // Get campaign by ID
  getCampaignById: async (id) => {
    try {
      if (!id) {
        throw new Error('Campaign ID is required');
      }
      const response = await api.get(`/admin/offers/${id}`);
      if (response.success && response.data?.campaign) {
        return response.data.campaign;
      }
      throw new Error(response.message || 'Campaign not found');
    } catch (error) {
      console.error('Failed to get campaign:', error);
      // Provide more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load campaign';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Get campaign by slug (admin)
  getCampaignBySlug: async (slug) => {
    try {
      const campaigns = get().campaigns;
      let campaign = campaigns.find((c) => c.slug === slug);
      if (!campaign) {
        // Try fetching from API
        const response = await api.get('/admin/offers');
        if (response.success && response.data?.campaigns) {
          campaign = response.data.campaigns.find((c) => c.slug === slug);
        }
      }
      return campaign;
    } catch (error) {
      console.error('Failed to get campaign by slug:', error);
      return null;
    }
  },

  // Get public campaign by ID or slug
  getPublicCampaignById: async (identifier) => {
    try {
      if (!identifier) {
        throw new Error('Campaign identifier is required');
      }
      const response = await api.get(`/campaigns/${identifier}`);
      if (response.success && response.data?.campaign) {
        return response.data.campaign;
      }
      throw new Error(response.message || 'Campaign not found');
    } catch (error) {
      console.error('Failed to get public campaign:', error);
      throw error;
    }
  },

  // Get public campaigns by type
  getPublicCampaignsByType: (type) => {
    return get().publicCampaigns.filter((campaign) => campaign.type === type);
  },

  // Get active public campaigns
  getActivePublicCampaigns: () => {
    const now = new Date();
    return get().publicCampaigns.filter(
      (campaign) =>
        campaign.isActive &&
        new Date(campaign.startDate) <= now &&
        new Date(campaign.endDate) >= now
    );
  },

  // Get campaigns by type
  getCampaignsByType: (type) => {
    return get().campaigns.filter((campaign) => campaign.type === type);
  },

  // Get active campaigns
  getActiveCampaigns: () => {
    const now = new Date();
    return get().campaigns.filter(
      (campaign) =>
        campaign.isActive &&
        new Date(campaign.startDate) <= now &&
        new Date(campaign.endDate) >= now
    );
  },

  // Create campaign
  createCampaign: async (campaignData) => {
    set({ isLoading: true });
    try {
      // Handle file upload if image is present
      const formData = new FormData();
      
      // Add all fields to formData
      Object.keys(campaignData).forEach((key) => {
        if (key === 'bannerConfig') {
          // Handle bannerConfig - if image is File, append separately, otherwise stringify the whole config
          if (campaignData.bannerConfig?.image instanceof File) {
            formData.append('image', campaignData.bannerConfig.image);
            // Append rest of bannerConfig without image
            const { image, ...restBannerConfig } = campaignData.bannerConfig;
            formData.append(key, JSON.stringify(restBannerConfig));
          } else {
            formData.append(key, JSON.stringify(campaignData[key]));
          }
        } else if (key === 'productIds' || key === 'pageConfig') {
          formData.append(key, JSON.stringify(campaignData[key]));
        } else {
          formData.append(key, campaignData[key]);
        }
      });

      const response = await api.post('/admin/offers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success && response.data?.campaign) {
        const newCampaign = response.data.campaign;
        // Add new campaign to public campaigns cache if it's active and within date range
        const now = new Date();
        const startDate = new Date(newCampaign.startDate);
        const endDate = new Date(newCampaign.endDate);
        const isActive = newCampaign.isActive && startDate <= now && endDate >= now;
        
        const currentPublicCampaigns = get().publicCampaigns;
        const updatedPublicCampaigns = isActive 
          ? [...currentPublicCampaigns, newCampaign]
          : currentPublicCampaigns;
        
        set({
          campaigns: [...get().campaigns, newCampaign],
          isLoading: false,
          publicCampaigns: updatedPublicCampaigns, // Add new campaign to cache if active
        });
        toast.success('Campaign created successfully');
        return newCampaign;
      }
      throw new Error(response.message || 'Failed to create campaign');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Update campaign
  updateCampaign: async (id, campaignData) => {
    set({ isLoading: true });
    try {
      // Validate ID
      if (!id) {
        throw new Error('Campaign ID is required');
      }

      // Validate productIds
      if (campaignData.productIds && (!Array.isArray(campaignData.productIds) || campaignData.productIds.length === 0)) {
        throw new Error('Please select at least one product');
      }

      // Handle file upload if image is present
      const formData = new FormData();
      
      Object.keys(campaignData).forEach((key) => {
        if (key === 'bannerConfig') {
          // Handle bannerConfig - if image is File, append separately, otherwise stringify the whole config
          if (campaignData.bannerConfig?.image instanceof File) {
            formData.append('image', campaignData.bannerConfig.image);
            // Append rest of bannerConfig without image
            const { image, ...restBannerConfig } = campaignData.bannerConfig;
            formData.append(key, JSON.stringify(restBannerConfig));
          } else {
            formData.append(key, JSON.stringify(campaignData[key]));
          }
        } else if (key === 'productIds' || key === 'pageConfig') {
          // Ensure productIds is properly formatted array
          if (key === 'productIds' && Array.isArray(campaignData[key])) {
            formData.append(key, JSON.stringify(campaignData[key]));
          } else if (key === 'pageConfig') {
            formData.append(key, JSON.stringify(campaignData[key]));
          }
        } else {
          formData.append(key, campaignData[key]);
        }
      });

      const response = await api.put(`/admin/offers/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success && response.data?.campaign) {
        const updatedCampaign = response.data.campaign;
        const campaigns = get().campaigns;
        const updatedCampaigns = campaigns.map((campaign) =>
          campaign.id === id || campaign._id === id || campaign.id === updatedCampaign.id || campaign._id === updatedCampaign._id
            ? updatedCampaign
            : campaign
        );
        
        // Update public campaigns cache with updated campaign
        const publicCampaigns = get().publicCampaigns;
        const now = new Date();
        const startDate = new Date(updatedCampaign.startDate);
        const endDate = new Date(updatedCampaign.endDate);
        const isActive = updatedCampaign.isActive && startDate <= now && endDate >= now;
        
        // Find and update or add/remove campaign from public cache
        const campaignExists = publicCampaigns.some(c => c.id === id || c._id === id);
        let updatedPublicCampaigns;
        
        if (isActive) {
          // Add or update campaign in cache
          if (campaignExists) {
            updatedPublicCampaigns = publicCampaigns.map(campaign =>
              campaign.id === id || campaign._id === id ? updatedCampaign : campaign
            );
          } else {
            updatedPublicCampaigns = [...publicCampaigns, updatedCampaign];
          }
        } else {
          // Remove campaign from cache if it's no longer active
          updatedPublicCampaigns = publicCampaigns.filter(
            campaign => campaign.id !== id && campaign._id !== id
          );
        }
        
        set({ 
          campaigns: updatedCampaigns, 
          isLoading: false,
          publicCampaigns: updatedPublicCampaigns, // Update cache with modified campaign
        });
        toast.success('Campaign updated successfully');
        return updatedCampaign;
      }
      throw new Error(response.message || 'Failed to update campaign');
    } catch (error) {
      set({ isLoading: false });
      // Provide better error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update campaign';
      toast.error(errorMessage);
      throw error;
    }
  },

  // Delete campaign
  deleteCampaign: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.delete(`/admin/offers/${id}`);
      if (response.success) {
        const campaigns = get().campaigns;
        const updatedCampaigns = campaigns.filter(
          (campaign) => campaign.id !== id && campaign._id !== id
        );
        
        // IMPORTANT: Remove deleted campaign from public campaigns cache
        // Instead of clearing entire cache, just remove the deleted one
        // This prevents all banners from disappearing
        const publicCampaigns = get().publicCampaigns;
        const updatedPublicCampaigns = publicCampaigns.filter(
          (campaign) => campaign.id !== id && campaign._id !== id
        );
        
        set({ 
          campaigns: updatedCampaigns, 
          isLoading: false,
          publicCampaigns: updatedPublicCampaigns, // Remove only deleted campaign
          // Keep lastPublicFetch so cache still works, but mark for refresh on next access
        });
        
        toast.success('Campaign deleted successfully');
        return true;
      }
      throw new Error(response.message || 'Failed to delete campaign');
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Toggle campaign status
  toggleCampaignStatus: async (id) => {
    try {
      const response = await api.patch(`/admin/offers/${id}/status`);
      if (response.success && response.data?.campaign) {
        const updatedCampaign = response.data.campaign;
        const campaigns = get().campaigns;
        const updatedCampaigns = campaigns.map((campaign) =>
          campaign.id === id || campaign._id === id
            ? updatedCampaign
            : campaign
        );
        
        // Update public campaigns cache based on new status
        const publicCampaigns = get().publicCampaigns;
        const now = new Date();
        const startDate = new Date(updatedCampaign.startDate);
        const endDate = new Date(updatedCampaign.endDate);
        const isActive = updatedCampaign.isActive && startDate <= now && endDate >= now;
        
        const campaignExists = publicCampaigns.some(c => c.id === id || c._id === id);
        let updatedPublicCampaigns;
        
        if (isActive) {
          // Add or update campaign in cache
          if (campaignExists) {
            updatedPublicCampaigns = publicCampaigns.map(campaign =>
              campaign.id === id || campaign._id === id ? updatedCampaign : campaign
            );
          } else {
            updatedPublicCampaigns = [...publicCampaigns, updatedCampaign];
          }
        } else {
          // Remove campaign from cache if it's no longer active
          updatedPublicCampaigns = publicCampaigns.filter(
            campaign => campaign.id !== id && campaign._id !== id
          );
        }
        
        set({ 
          campaigns: updatedCampaigns,
          publicCampaigns: updatedPublicCampaigns, // Update cache with status change
        });
        return updatedCampaign;
      }
      throw new Error(response.message || 'Failed to toggle campaign status');
    } catch (error) {
      throw error;
    }
  },

  // Clear public campaigns cache (useful for forcing refresh)
  clearPublicCampaignsCache: () => {
    set({ 
      publicCampaigns: [], 
      lastPublicFetch: null 
    });
  },
    }),
    {
      name: 'campaign-store', // unique name for localStorage
      partialize: (state) => ({
        publicCampaigns: state.publicCampaigns,
        lastPublicFetch: state.lastPublicFetch,
      }), // Only persist public campaigns and last fetch time
    }
  )
);
