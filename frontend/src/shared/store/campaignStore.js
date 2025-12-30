import { create } from 'zustand';
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

export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  isLoading: false,

  // Initialize campaigns from API
  initialize: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const { type, page = 1, limit = 10 } = filters;
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
      return { campaigns: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }
  },

  // Get all campaigns
  getCampaigns: () => {
    return get().campaigns;
  },

  // Get campaign by ID
  getCampaignById: async (id) => {
    try {
      const response = await api.get(`/admin/offers/${id}`);
      if (response.success && response.data?.campaign) {
        return response.data.campaign;
      }
      throw new Error(response.message || 'Campaign not found');
    } catch (error) {
      console.error('Failed to get campaign:', error);
      throw error;
    }
  },

  // Get campaign by slug
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
        set({
          campaigns: [...get().campaigns, newCampaign],
          isLoading: false,
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
          formData.append(key, JSON.stringify(campaignData[key]));
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
        set({ campaigns: updatedCampaigns, isLoading: false });
        toast.success('Campaign updated successfully');
        return updatedCampaign;
      }
      throw new Error(response.message || 'Failed to update campaign');
    } catch (error) {
      set({ isLoading: false });
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
        set({ campaigns: updatedCampaigns, isLoading: false });
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
        set({ campaigns: updatedCampaigns });
        return updatedCampaign;
      }
      throw new Error(response.message || 'Failed to toggle campaign status');
    } catch (error) {
      throw error;
    }
  },
}));
