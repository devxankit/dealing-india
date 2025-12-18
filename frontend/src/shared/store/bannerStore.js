import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import toast from "react-hot-toast";
import heroSlide1 from "../../../data/hero/slide1.png";

export const useBannerStore = create(
  persist(
    (set, get) => ({
      banners: [],
      isLoading: false,

      // Initialize banners
      initialize: () => {
        const savedBanners = localStorage.getItem("admin-banners");
        if (savedBanners) {
          set({ banners: JSON.parse(savedBanners) });
        } else {
          // Initialize with some default banners
          const defaultBanners = [
            {
              id: 1,
              type: "hero",
              title: "Welcome to Our Store",
              subtitle: "Discover Amazing Products",
              image: heroSlide1,
              link: "/",
              order: 1,
              isActive: true,
              startDate: null,
              endDate: null,
            },
          ];
          set({ banners: defaultBanners });
          localStorage.setItem("admin-banners", JSON.stringify(defaultBanners));
        }
      },

      // Get all banners
      getBanners: () => {
        const state = get();
        if (state.banners.length === 0) {
          state.initialize();
        }
        return get().banners;
      },

      // Get banner by ID
      getBannerById: (id) => {
        return get().banners.find((banner) => banner.id === parseInt(id));
      },

      // Get banners by type
      getBannersByType: (type) => {
        return get().banners.filter((banner) => banner.type === type);
      },

      // Create banner
      createBanner: (bannerData) => {
        set({ isLoading: true });
        try {
          const banners = get().banners;
          const newId =
            banners.length > 0 ? Math.max(...banners.map((b) => b.id)) + 1 : 1;

          const newBanner = {
            id: newId,
            type: bannerData.type, // 'hero', 'promotional'
            title: bannerData.title || "",
            subtitle: bannerData.subtitle || "",
            description: bannerData.description || "",
            image: bannerData.image || "",
            link: bannerData.link || "",
            order: bannerData.order || banners.length + 1,
            isActive:
              bannerData.isActive !== undefined ? bannerData.isActive : true,
            startDate: bannerData.startDate || null,
            endDate: bannerData.endDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedBanners = [...banners, newBanner];
          set({ banners: updatedBanners, isLoading: false });
          localStorage.setItem("admin-banners", JSON.stringify(updatedBanners));
          toast.success("Banner created successfully");
          return newBanner;
        } catch (error) {
          set({ isLoading: false });
          toast.error("Failed to create banner");
          throw error;
        }
      },

      // Update banner
      updateBanner: (id, bannerData) => {
        set({ isLoading: true });
        try {
          const banners = get().banners;
          const updatedBanners = banners.map((banner) =>
            banner.id === parseInt(id)
              ? {
                  ...banner,
                  ...bannerData,
                  updatedAt: new Date().toISOString(),
                }
              : banner
          );
          set({ banners: updatedBanners, isLoading: false });
          localStorage.setItem("admin-banners", JSON.stringify(updatedBanners));
          toast.success("Banner updated successfully");
          return updatedBanners.find((banner) => banner.id === parseInt(id));
        } catch (error) {
          set({ isLoading: false });
          toast.error("Failed to update banner");
          throw error;
        }
      },

      // Delete banner
      deleteBanner: (id) => {
        set({ isLoading: true });
        try {
          const banners = get().banners;
          const updatedBanners = banners.filter(
            (banner) => banner.id !== parseInt(id)
          );
          set({ banners: updatedBanners, isLoading: false });
          localStorage.setItem("admin-banners", JSON.stringify(updatedBanners));
          toast.success("Banner deleted successfully");
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error("Failed to delete banner");
          throw error;
        }
      },

      // Reorder banners
      reorderBanners: (bannerIds) => {
        set({ isLoading: true });
        try {
          const banners = get().banners;
          const updatedBanners = banners.map((banner) => {
            const newOrder = bannerIds.indexOf(banner.id);
            return newOrder !== -1
              ? { ...banner, order: newOrder + 1 }
              : banner;
          });
          set({ banners: updatedBanners, isLoading: false });
          localStorage.setItem("admin-banners", JSON.stringify(updatedBanners));
          toast.success("Banners reordered successfully");
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error("Failed to reorder banners");
          throw error;
        }
      },

      // Toggle banner status
      toggleBannerStatus: (id) => {
        const banner = get().getBannerById(id);
        if (banner) {
          get().updateBanner(id, { isActive: !banner.isActive });
        }
      },
    }),
    {
      name: "banner-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
