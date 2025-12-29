import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// Helper to transform MongoDB _id to id for frontend compatibility
const transformCategory = (category) => {
  if (!category) return null;
  
  // Convert _id to id
  const id = category._id?.toString() || category.id?.toString() || category.id;
  
  // Convert parentId to string for consistent comparison
  const parentId = category.parentId 
    ? (category.parentId.toString ? category.parentId.toString() : String(category.parentId))
    : null;
  
  return {
    ...category,
    id,
    parentId,
  };
};

const transformCategories = (categories) => {
  return categories.map(transformCategory);
};

export const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,

      // Initialize categories - fetch from API
      initialize: async (forceRefresh = false) => {
        set({ isLoading: true });
        try {
          const params = {
            limit: 1000, // Get all categories
            sortBy: 'order',
            sortOrder: 'asc',
          };
          
          // Add cache-busting parameter if force refresh
          if (forceRefresh) {
            params._t = Date.now();
          }
          
          const response = await api.get('/categories', { params });
          const categories = transformCategories(response.data.categories || []);
          set({ categories, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch categories:', error);
          // Keep categories empty on error - don't use mock data
          set({ categories: [], isLoading: false });
        }
      },

      // Get all categories
      getCategories: () => {
        const state = get();
        if (state.categories.length === 0) {
          state.initialize();
        }
        return get().categories;
      },

      // Get category by ID
      getCategoryById: (id) => {
        const categories = get().categories;
        return categories.find((cat) => {
          const catId = cat.id || cat._id;
          const searchId = id?.toString() || id;
          return catId?.toString() === searchId;
        });
      },

      // Create category
      createCategory: async (categoryData) => {
        set({ isLoading: true });
        try {
          // Convert id to _id if needed for parentId
          const payload = {
            ...categoryData,
            parentId: categoryData.parentId || null,
          };

          const response = await api.post('/admin/categories', payload);
          const newCategory = transformCategory(response.data.category);

          // Refresh categories list with force refresh
          await get().initialize(true);

          set({ isLoading: false });
          toast.success('Category created successfully');
          return newCategory;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to create category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Update category
      updateCategory: async (id, categoryData) => {
        set({ isLoading: true });
        try {
          const categoryId = id?.toString() || id;
          const payload = {
            ...categoryData,
            parentId: categoryData.parentId || null,
          };

          const response = await api.put(`/admin/categories/${categoryId}`, payload);
          const updatedCategory = transformCategory(response.data.category);

          // Refresh categories list with force refresh
          await get().initialize(true);

          set({ isLoading: false });
          toast.success('Category updated successfully');
          return updatedCategory;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to update category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Delete category
      deleteCategory: async (id) => {
        set({ isLoading: true });
        try {
          const categoryId = id?.toString() || id;
          await api.delete(`/admin/categories/${categoryId}`);

          // Refresh categories list with force refresh
          await get().initialize(true);

          set({ isLoading: false });
          toast.success('Category deleted successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to delete category';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Bulk delete categories
      bulkDeleteCategories: async (ids) => {
        set({ isLoading: true });
        try {
          // Convert ids to strings if needed
          const categoryIds = ids.map(id => id?.toString() || id);
          await api.delete('/admin/categories/bulk', {
            data: { ids: categoryIds },
          });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success(`${ids.length} categories deleted successfully`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to delete categories';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Toggle category status
      toggleCategoryStatus: (id) => {
        const category = get().getCategoryById(id);
        if (category) {
          get().updateCategory(id, { isActive: !category.isActive });
        }
      },

      // Get categories by parent
      getCategoriesByParent: (parentId) => {
        const categories = get().categories;
        if (!parentId) return categories.filter((cat) => !cat.parentId);

        // Normalize parentId to string for comparison
        const parentIdStr = parentId?.toString() || String(parentId);
        
        return categories.filter((cat) => {
          // Normalize category's parentId to string
          const catParentId = cat.parentId 
            ? (cat.parentId.toString ? cat.parentId.toString() : String(cat.parentId))
            : null;
          
          // Compare as strings
          return catParentId === parentIdStr;
        });
      },

      // Get root categories
      getRootCategories: () => {
        return get().categories.filter((cat) => !cat.parentId);
      },

      // Reorder categories (using bulk order update)
      reorderCategories: async (categoryIds) => {
        set({ isLoading: true });
        try {
          // Prepare orders array
          const orders = categoryIds.map((id, index) => ({
            id: id?.toString() || id,
            order: index + 1,
          }));

          await api.put('/admin/categories/bulk-order', { orders });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success('Categories reordered successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to reorder categories';
          toast.error(errorMessage);
          throw error;
        }
      },

      // Bulk update category order (for CategoryOrder page)
      bulkUpdateCategoryOrder: async (orderUpdates) => {
        set({ isLoading: true });
        try {
          // Prepare orders array - orderUpdates should be [{ id, order }, ...]
          const orders = orderUpdates.map((item) => ({
            id: item.id?.toString() || item.id,
            order: parseInt(item.order),
          }));

          await api.put('/admin/categories/bulk-order', { orders });

          // Refresh categories list
          await get().initialize();

          set({ isLoading: false });
          toast.success('Category order saved successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.message || 'Failed to save category order';
          toast.error(errorMessage);
          throw error;
        }
      },
    }),
    {
      name: 'category-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
