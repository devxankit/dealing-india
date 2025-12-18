import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';

// Helper function to generate URL-friendly slug
const generateSlug = (name, existingCampaigns = []) => {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 50); // Max length 50

  // Ensure uniqueness
  let uniqueSlug = slug;
  let counter = 1;
  while (existingCampaigns.some(c => c.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

// Default page config
const getDefaultPageConfig = () => ({
  showCountdown: true,
  countdownType: 'campaign_end', // 'campaign_end' | 'daily_reset' | 'custom'
  viewModes: ['grid', 'list'],
  defaultViewMode: 'grid',
  enableFilters: true,
  enableSorting: true,
  productsPerPage: 12,
  showStats: true,
});

export const useCampaignStore = create(
  persist(
    (set, get) => ({
      campaigns: [],
      isLoading: false,

      // Initialize campaigns
      initialize: () => {
        const savedCampaigns = localStorage.getItem('admin-campaigns');
        if (savedCampaigns) {
          const campaigns = JSON.parse(savedCampaigns);
          // Ensure all campaigns have slug and route (migration for existing campaigns)
          const migratedCampaigns = campaigns.map(campaign => {
            if (!campaign.slug) {
              const slug = generateSlug(campaign.name, campaigns.filter(c => c.id !== campaign.id));
              return {
                ...campaign,
                slug,
                route: `/sale/${slug}`,
                pageConfig: campaign.pageConfig || getDefaultPageConfig(),
              };
            }
            if (!campaign.pageConfig) {
              return {
                ...campaign,
                pageConfig: getDefaultPageConfig(),
              };
            }
            return campaign;
          });
          set({ campaigns: migratedCampaigns });
          if (migratedCampaigns.length !== campaigns.length || 
              migratedCampaigns.some((c, i) => c.slug !== campaigns[i]?.slug)) {
            localStorage.setItem('admin-campaigns', JSON.stringify(migratedCampaigns));
          }
        } else {
          set({ campaigns: [] });
        }
      },

      // Get all campaigns
      getCampaigns: () => {
        const state = get();
        if (state.campaigns.length === 0) {
          state.initialize();
        }
        return get().campaigns;
      },

      // Get campaign by ID
      getCampaignById: (id) => {
        return get().campaigns.find((campaign) => campaign.id === parseInt(id));
      },

      // Get campaign by slug
      getCampaignBySlug: (slug) => {
        return get().campaigns.find((campaign) => campaign.slug === slug);
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
      createCampaign: (campaignData) => {
        set({ isLoading: true });
        try {
          const campaigns = get().campaigns;
          const newId = campaigns.length > 0 
            ? Math.max(...campaigns.map((c) => c.id)) + 1 
            : 1;
          
          // Generate slug from name (or use provided slug)
          const slug = campaignData.slug || generateSlug(campaignData.name, campaigns);
          
          // Merge page config with defaults
          const pageConfig = {
            ...getDefaultPageConfig(),
            ...(campaignData.pageConfig || {}),
          };

          const newCampaign = {
            id: newId,
            name: campaignData.name,
            slug,
            route: `/sale/${slug}`,
            type: campaignData.type, // 'flash_sale', 'daily_deal', 'special_offer', 'festival'
            description: campaignData.description || '',
            discountType: campaignData.discountType, // 'percentage', 'fixed', 'buy_x_get_y'
            discountValue: campaignData.discountValue,
            startDate: campaignData.startDate,
            endDate: campaignData.endDate,
            productIds: campaignData.productIds || [],
            isActive: campaignData.isActive !== undefined ? campaignData.isActive : true,
            pageConfig,
            autoCreateBanner: campaignData.autoCreateBanner !== undefined ? campaignData.autoCreateBanner : true,
            bannerConfig: campaignData.bannerConfig || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedCampaigns = [...campaigns, newCampaign];
          set({ campaigns: updatedCampaigns, isLoading: false });
          localStorage.setItem('admin-campaigns', JSON.stringify(updatedCampaigns));
          
          // Auto-create banner if enabled (handled in component to avoid circular dependency)
          // The banner will be created in CampaignForm component after campaign creation
          
          toast.success('Campaign created successfully');
          return newCampaign;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to create campaign');
          throw error;
        }
      },

      // Update campaign
      updateCampaign: (id, campaignData) => {
        set({ isLoading: true });
        try {
          const campaigns = get().campaigns;
          const updatedCampaigns = campaigns.map((campaign) =>
            campaign.id === parseInt(id)
              ? { ...campaign, ...campaignData, updatedAt: new Date().toISOString() }
              : campaign
          );
          set({ campaigns: updatedCampaigns, isLoading: false });
          localStorage.setItem('admin-campaigns', JSON.stringify(updatedCampaigns));
          toast.success('Campaign updated successfully');
          return updatedCampaigns.find((campaign) => campaign.id === parseInt(id));
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to update campaign');
          throw error;
        }
      },

      // Delete campaign
      deleteCampaign: (id) => {
        set({ isLoading: true });
        try {
          const campaigns = get().campaigns;
          const updatedCampaigns = campaigns.filter((campaign) => campaign.id !== parseInt(id));
          set({ campaigns: updatedCampaigns, isLoading: false });
          localStorage.setItem('admin-campaigns', JSON.stringify(updatedCampaigns));
          toast.success('Campaign deleted successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to delete campaign');
          throw error;
        }
      },

      // Toggle campaign status
      toggleCampaignStatus: (id) => {
        const campaign = get().getCampaignById(id);
        if (campaign) {
          get().updateCampaign(id, { isActive: !campaign.isActive });
        }
      },
    }),
    {
      name: 'campaign-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Export slug generation function for use in other components
export { generateSlug };

