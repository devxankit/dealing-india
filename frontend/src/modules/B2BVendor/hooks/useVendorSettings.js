import { useState, useEffect } from 'react';
import api from '../../../shared/utils/api';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { getBusinessTypes } from '../../../shared/utils/businessTypeCache';

// Cache to prevent multiple redundant calls across different components
let settingsCache = {}; // Slug -> Data
let settingsPromises = {}; // Slug -> Promise

export const useVendorSettings = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!vendor) return;

        const fetchSettings = async () => {
            try {
                // Get the slug first
                const businessTypes = await getBusinessTypes();
                const vendorType = businessTypes.find(t =>
                    t.name === vendor.businessType ||
                    t.slug === vendor.businessType ||
                    t._id === vendor.businessTypeRef
                );

                if (!vendorType) {
                    setLoading(false);
                    return;
                }

                const slug = vendorType.slug;

                // Check cache first
                if (settingsCache[slug]) {
                    setSettings(settingsCache[slug]);
                    setLoading(false);
                    return;
                }

                // Check if a request is already in flight
                if (settingsPromises[slug]) {
                    const data = await settingsPromises[slug];
                    setSettings(data);
                    setLoading(false);
                    return;
                }

                // Create a new request promise
                settingsPromises[slug] = api.get(`/admin/business-settings/${slug}`)
                    .then(response => {
                        if (response.success) {
                            settingsCache[slug] = response.data;
                            return response.data;
                        }
                        throw new Error(response.message || 'Failed to fetch settings');
                    })
                    .catch(err => {
                        // Clear promise on error to allow retry
                        delete settingsPromises[slug];
                        throw err;
                    });

                const data = await settingsPromises[slug];
                setSettings(data);
            } catch (err) {
                console.error('Error fetching vendor business settings:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [vendor]);

    return { settings, loading, error };
};
