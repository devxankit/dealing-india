/**
 * Mega Reward Admin Helpers
 * 
 * NOTE: This file previously contained mock data and localStorage helpers.
 * The application now uses real backend APIs for all Mega Reward functionality.
 * 
 * This file is kept for backward compatibility but should be removed
 * once all components are verified to work with the real APIs.
 */

// Legacy functions - kept for reference but no longer used
// The frontend now fetches data from:
// - GET /api/admin/mega-reward/settings
// - GET /api/admin/mega-reward/entries
// - GET /api/admin/mega-reward/winners

export const getMegaRewardData = () => {
    console.warn('getMegaRewardData is deprecated. Use API calls instead.');
    return { settings: null, entries: [], winners: [] };
};

export const saveMegaRewardData = (data) => {
    console.warn('saveMegaRewardData is deprecated. Use API calls instead.');
};

// Mock data removed - all data now comes from backend
export const MOCK_ENTRIES = [];
export const MOCK_WINNERS = [];
export const MOCK_SETTINGS = {};
