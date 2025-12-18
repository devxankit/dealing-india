import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { categories as initialCategories } from '../../data/categories';
import toast from 'react-hot-toast';

export const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,

      // Initialize categories
      initialize: () => {
        const savedCategories = localStorage.getItem('admin-categories');
        if (savedCategories) {
          set({ categories: JSON.parse(savedCategories) });
        } else {
          set({ categories: initialCategories });
          localStorage.setItem('admin-categories', JSON.stringify(initialCategories));
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
        return get().categories.find((cat) => cat.id === parseInt(id));
      },

      // Create category
      createCategory: (categoryData) => {
        set({ isLoading: true });
        try {
          const categories = get().categories;
          const newId = categories.length > 0
            ? Math.max(...categories.map((c) => c.id)) + 1
            : 1;

          const newCategory = {
            id: newId,
            ...categoryData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
            parentId: categoryData.parentId || null,
            order: categoryData.order || categories.length + 1,
          };

          const updatedCategories = [...categories, newCategory];
          set({ categories: updatedCategories, isLoading: false });
          localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));
          toast.success('Category created successfully');
          return newCategory;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to create category');
          throw error;
        }
      },

      // Update category
      updateCategory: (id, categoryData) => {
        set({ isLoading: true });
        try {
          const categories = get().categories;
          const updatedCategories = categories.map((cat) =>
            cat.id === parseInt(id)
              ? { ...cat, ...categoryData, updatedAt: new Date().toISOString() }
              : cat
          );
          set({ categories: updatedCategories, isLoading: false });
          localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));
          toast.success('Category updated successfully');
          return updatedCategories.find((cat) => cat.id === parseInt(id));
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to update category');
          throw error;
        }
      },

      // Delete category
      deleteCategory: (id) => {
        set({ isLoading: true });
        try {
          const categories = get().categories;
          // Check if category has children
          const hasChildren = categories.some((cat) => cat.parentId === parseInt(id));
          if (hasChildren) {
            toast.error('Cannot delete category with subcategories');
            set({ isLoading: false });
            return false;
          }
          const updatedCategories = categories.filter((cat) => cat.id !== parseInt(id));
          set({ categories: updatedCategories, isLoading: false });
          localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));
          toast.success('Category deleted successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to delete category');
          throw error;
        }
      },

      // Bulk delete categories
      bulkDeleteCategories: (ids) => {
        set({ isLoading: true });
        try {
          const categories = get().categories;
          // Check for categories with children
          const hasChildren = ids.some((id) =>
            categories.some((cat) => cat.parentId === parseInt(id))
          );
          if (hasChildren) {
            toast.error('Cannot delete categories with subcategories');
            set({ isLoading: false });
            return false;
          }
          const updatedCategories = categories.filter(
            (cat) => !ids.includes(cat.id)
          );
          set({ categories: updatedCategories, isLoading: false });
          localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));
          toast.success(`${ids.length} categories deleted successfully`);
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to delete categories');
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
        const parentIdNum = parentId ? parseInt(parentId) : null;
        return get().categories.filter((cat) => {
          const catParentId = cat.parentId ? parseInt(cat.parentId) : null;
          return catParentId === parentIdNum;
        });
      },

      // Get root categories
      getRootCategories: () => {
        return get().categories.filter((cat) => !cat.parentId);
      },

      // Reorder categories
      reorderCategories: (categoryIds) => {
        set({ isLoading: true });
        try {
          const categories = get().categories;
          const updatedCategories = categories.map((cat) => {
            const newOrder = categoryIds.indexOf(cat.id);
            return newOrder !== -1 ? { ...cat, order: newOrder + 1 } : cat;
          });
          set({ categories: updatedCategories, isLoading: false });
          localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));
          toast.success('Categories reordered successfully');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Failed to reorder categories');
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

