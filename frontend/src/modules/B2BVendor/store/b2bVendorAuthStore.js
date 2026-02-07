import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

export const useB2BVendorAuthStore = create(
    persist(
        (set) => ({
            vendor: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            login: async (email, password) => {
                set({ loading: true, error: null });
                try {
                    // Validate inputs
                    if (!email || !password) {
                        const error = new Error('Email and password are required');
                        set({ loading: false, error: error.message });
                        return { success: false, message: error.message };
                    }

                    console.log('[B2B Vendor Login] Attempting login for:', email);
                    const response = await api.post('/auth/vendor/login', { email, password });
                    console.log('[B2B Vendor Login] Full API Response:', JSON.stringify(response, null, 2));

                    // Handle different response structures
                    // API interceptor returns response.data, so response is already unwrapped
                    let vendor, token;

                    if (response && response.success && response.data) {
                        // Standard structure: { success: true, data: { vendor, token } }
                        vendor = response.data.vendor;
                        token = response.data.token;
                        console.log('[B2B Vendor Login] Using standard response structure');
                    } else if (response && response.vendor && response.token) {
                        // Direct structure: { vendor, token }
                        vendor = response.vendor;
                        token = response.token;
                        console.log('[B2B Vendor Login] Using direct response structure');
                    } else {
                        console.error('[B2B Vendor Login] Unexpected response structure:', response);
                        const errorMessage = response?.message || 'Login failed - invalid response structure';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    // Validate vendor exists
                    if (!vendor) {
                        console.error('[B2B Vendor Login] No vendor data in response');
                        const errorMessage = 'Login failed - vendor data not received';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    console.log('[B2B Vendor Login] Vendor data received:', vendor);
                    console.log('[B2B Vendor Login] Vendor Type:', vendor.vendorType, 'Type:', typeof vendor.vendorType);
                    console.log('[B2B Vendor Login] Token received:', token ? 'Yes' : 'No');

                    // Validate vendor type for B2B login (check for exact match, handle string comparison)
                    const vendorType = String(vendor.vendorType || '').toLowerCase().trim();
                    if (vendorType !== 'b2b') {
                        console.error('[B2B Vendor Login] Vendor type mismatch. Expected: b2b, Got:', vendorType, 'Raw:', vendor.vendorType);
                        const error = new Error('This account is not a B2B vendor account. Please contact support if you believe this is an error.');
                        set({ loading: false, error: error.message });
                        return { success: false, message: error.message };
                    }

                    // Transform backend vendor object to frontend format
                    const vendorData = {
                        id: vendor._id || vendor.id,
                        _id: vendor._id,
                        name: vendor.name,
                        email: vendor.email,
                        phone: vendor.phone || '',
                        storeName: vendor.storeName,
                        storeDescription: vendor.storeDescription || '',
                        role: vendor.role || 'vendor',
                        vendorType: vendor.vendorType || 'b2b',
                        businessTypes: vendor.businessTypes || [],
                        gstNumber: vendor.gstNumber || '',
                        address: vendor.address || {},
                        status: vendor.status,
                        isEmailVerified: vendor.isEmailVerified || false,
                        currentSubscription: vendor.currentSubscription || null,
                        businessType: vendor.businessType || 'Textile',
                        businessTypeRef: vendor.businessTypeRef || null,
                    };

                    if (!token) {
                        console.error('[B2B Vendor Login] No token received');
                        const errorMessage = 'Login failed - no authentication token received';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    console.log('[B2B Vendor Login] Login successful, setting token and vendor data');

                    // Set token in localStorage FIRST (before Zustand state update)
                    localStorage.setItem('b2b-vendor-token', token);
                    // Store login timestamp to prevent immediate redirects
                    sessionStorage.setItem('b2b-vendor-login-timestamp', Date.now().toString());
                    console.log('[B2B Vendor Login] Token set in localStorage');

                    // Update Zustand state - this will trigger persist middleware
                    set({
                        vendor: vendorData,
                        token,
                        isAuthenticated: true,
                        loading: false,
                        error: null
                    });

                    console.log('[B2B Vendor Login] State updated via set()');
                    console.log('[B2B Vendor Login] Token in localStorage after set:', localStorage.getItem('b2b-vendor-token') ? 'Yes' : 'No');

                    return { success: true };
                } catch (error) {
                    let errorMessage = 'Login failed. Please check your credentials.';

                    if (error.response?.status === 401) {
                        errorMessage = 'Invalid email or password';
                    } else if (error.response?.status === 403) {
                        errorMessage = error.response?.data?.message || 'Account is not approved or inactive. Please contact support.';
                    } else if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    set({ loading: false, error: errorMessage });
                    return { success: false, message: errorMessage };
                }
            },

            setAuth: (vendor, token) => set({
                vendor,
                token,
                isAuthenticated: !!token,
                error: null
            }),

            logout: () => {
                localStorage.removeItem('b2b-vendor-token');
                sessionStorage.removeItem('b2b-vendor-login-timestamp');
                set({
                    vendor: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            setError: (error) => set({ error }),
            setLoading: (loading) => set({ loading }),

            // Update vendor profile
            updateProfile: async (profileData) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.put('/auth/vendor/profile', profileData);

                    if (response.success && response.data) {
                        const vendor = response.data.vendor;

                        // Transform backend vendor object to frontend format
                        const updatedVendor = {
                            id: vendor._id || vendor.id,
                            _id: vendor._id,
                            name: vendor.name,
                            email: vendor.email,
                            phone: vendor.phone || '',
                            storeName: vendor.storeName,
                            storeDescription: vendor.storeDescription || '',
                            role: vendor.role || 'vendor',
                            vendorType: vendor.vendorType || 'b2b',
                            businessTypes: vendor.businessTypes || [],
                            gstNumber: vendor.gstNumber || '',
                            address: vendor.address || {},
                            status: vendor.status,
                            isEmailVerified: vendor.isEmailVerified || false,
                            currentSubscription: vendor.currentSubscription || null,
                            businessType: vendor.businessType || 'Textile',
                            businessTypeRef: vendor.businessTypeRef || null,
                        };

                        set({
                            vendor: updatedVendor,
                            loading: false,
                            error: null
                        });

                        return { success: true, vendor: updatedVendor };
                    } else {
                        throw new Error(response.message || 'Profile update failed');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },
        }),
        {
            name: 'b2b-vendor-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
