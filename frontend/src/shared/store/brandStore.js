import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { brands as initialBrands } from '../../data/brands';
import toast from 'react-hot-toast';

export const useBrandStore = create(
  persist(
    (set, get) => ({
      brands: [],
      isLoading: false,

      // Initialize brands
      initialize: () => {
        const savedBrands = localStorage.getItem('admin-brands');
        if (savedBrands) {
          set({ brands: JSON.parse(savedBrands) });
        } else {
          set({ brands: initialBrands });
          localStorage.setItem('admin-brands', JSON.stringify(initialBrands));
        }
      },

      // Get all brands
      getBrands: () => {
        const state = get();
        if (state.brands.length === 0) {
          state.initialize();
        }
        return get().brands;
      },

      // Get brand by ID
      getBrandById: (id) => {
        return get().brands.find((brand) => brand.id === parseInt(id));
      },

      // Create brand
      createBrand: (brandData) => {
        set({ isLoading: true });
        try {
          const brands = get().brands;
          const newId = brands.length > 0
            ? Math.max(...brands.map((b) => b.id)) + 1
            : 1;

          const newBrand = {
            id: newId,
            name: brandData.name,
            logo: brandData.logo || '',
            description: brandData.description || '',
            website: brandData.website || '',
            isActive: brandData.isActive !== undefined ? brandData.isActive : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedBrands = [...brands, newBrand];
          set({ brands: updatedBrands, isLoading: false });
          localStorage.setItem('admin-brands', JSON.stringify(updatedBrands));
          toast.success('Brand created successfully');
          return newBrand;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to create brand');
          throw error;
        }
      },

      // Update brand
      updateBrand: (id, brandData) => {
        set({ isLoading: true });
        try {
          const brands = get().brands;
          const updatedBrands = brands.map((brand) =>
            brand.id === parseInt(id)
              ? { ...brand, ...brandData, updatedAt: new Date().toISOString() }
              : brand
          );
          set({ brands: updatedBrands, isLoading: false });
          localStorage.setItem('admin-brands', JSON.stringify(updatedBrands));
          toast.success('Brand updated successfully');
          return updatedBrands.find((brand) => brand.id === parseInt(id));
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to update brand');
          throw error;
        }
      },

      // Delete brand
      deleteBrand: (id) => {
        set({ isLoading: true });
        try {
          const brands = get().brands;
          const updatedBrands = brands.filter((brand) => brand.id !== parseInt(id));
          set({ brands: updatedBrands, isLoading: false });
          localStorage.setItem('admin-brands', JSON.stringify(updatedBrands));
          toast.success('Brand deleted successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to delete brand');
          throw error;
        }
      },

      // Bulk delete brands
      bulkDeleteBrands: (ids) => {
        set({ isLoading: true });
        try {
          const brands = get().brands;
          const updatedBrands = brands.filter(
            (brand) => !ids.includes(brand.id)
          );
          set({ brands: updatedBrands, isLoading: false });
          localStorage.setItem('admin-brands', JSON.stringify(updatedBrands));
          toast.success(`${ids.length} brands deleted successfully`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to delete brands');
          throw error;
        }
      },

      // Toggle brand status
      toggleBrandStatus: (id) => {
        const brand = get().getBrandById(id);
        if (brand) {
          get().updateBrand(id, { isActive: !brand.isActive });
        }
      },
    }),
    {
      name: 'brand-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

