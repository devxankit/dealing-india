import { useState, useEffect } from 'react';
import api from '../../../shared/utils/api';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';
import { getBusinessTypes } from '../../../shared/utils/businessTypeCache';

export const useVendorSettings = () => {
    const { vendor } = useB2BVendorAuthStore();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!vendor) return;

        const fetchSettings = async () => {
            try {
                setLoading(true);
                // We need the slug. Let's fetch business types first if we don't have it, 
                // but usually vendor.businessType name works if mapped on backend.
                // However, the backend getSettingsBySlug uses findOne({ slug: req.params.slug })

                // Let's get the slug first
                const businessTypes = await getBusinessTypes();
                const vendorType = businessTypes.find(t =>
                    t.name === vendor.businessType ||
                    t.slug === vendor.businessType ||
                    t._id === vendor.businessTypeRef
                );

                if (vendorType) {
                    const response = await api.get(`/admin/business-settings/${vendorType.slug}`);
                    if (response.success) {
                        setSettings(response.data);
                    }
                }
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
