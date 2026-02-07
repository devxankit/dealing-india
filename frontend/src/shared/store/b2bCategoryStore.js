import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// Helper to transform MongoDB _id to id for frontend compatibility
const transformCategory = (category) => {
    if (!category) return null;

    return {
        ...category,
        id: category._id?.toString() || category.id?.toString() || category.id,
    };
};

const transformCategories = (categories) => {
    return categories.map(transformCategory);
};

export const useB2BCategoryStore = create(
    persist(
        (set, get) => ({
            categories: [],
            isLoading: false,

            // Initialize categories - fetch from API
            initialize: async (forceRefresh = false) => {
                const currentState = get();

                // Prevent duplicate fetch if already loading
                if (currentState.isLoading) return;

                // Prevent fetch if we already have categories and not forcing refresh
                if (!forceRefresh && currentState.categories.length > 0) {
                    return;
                }

                set({ isLoading: true });

                try {
                    const response = await api.get('/public/b2b-categories');
                    const list = response?.data || [];
                    const categories = transformCategories(list);

                    set({ categories, isLoading: false });
                } catch (error) {
                    console.error('Failed to fetch B2B categories:', error);
                    // Don't clear existing categories on error if we simply failed to refresh
                    set({ isLoading: false });
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
        }),
        {
            name: 'b2b-category-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
