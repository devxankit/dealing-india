import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useB2BModeStore = create(
    persist(
        (set) => ({
            isB2BMode: false,
            toggleB2BMode: () => set((state) => ({ isB2BMode: !state.isB2BMode })),
            setB2BMode: (value) => set({ isB2BMode: value }),
        }),
        {
            name: 'vendor-b2b-mode',
        }
    )
);
