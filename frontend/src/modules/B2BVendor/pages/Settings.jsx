import { useState, useEffect } from "react";
import { FiUser, FiBell, FiLock, FiShield, FiSave } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "../../../shared/utils/toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";

const B2BVendorSettings = () => {
    const { vendor, updateProfile } = useB2BVendorAuthStore();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        storeName: "",
        gstNumber: "",
        address: {
            street: "",
            landmark: "",
            city: "",
            state: "",
            pincode: "",
            country: "India"
        }
    });

    // Initialize form data from vendor
    useEffect(() => {
        if (vendor) {
            const address = vendor.address || {};
            setFormData({
                storeName: vendor.storeName || "",
                gstNumber: vendor.gstNumber || "",
                address: {
                    street: address.street || "",
                    landmark: address.landmark || "",
                    city: address.city || "",
                    state: address.state || "",
                    pincode: address.pincode || address.zipCode || "",
                    country: address.country || "India"
                }
            });
        }
    }, [vendor]);

    const tabs = [
        { id: "profile", label: "Business Profile", icon: FiUser },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Handle nested address fields
        if (name.startsWith('address.')) {
            const addressField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async () => {
        if (!vendor) {
            toast.error("Vendor information not available");
            return;
        }

        if (!formData.storeName.trim()) {
            toast.error("Company Name is required");
            return;
        }

        setLoading(true);
        try {
            // Validate required address fields
            if (!formData.address.city || !formData.address.state) {
                toast.error("City and State are required");
                setLoading(false);
                return;
            }

            // Clean and prepare address object
            const address = {
                street: (formData.address.street || "").trim(),
                landmark: (formData.address.landmark || "").trim(),
                city: (formData.address.city || "").trim(),
                state: (formData.address.state || "").trim(),
                pincode: (formData.address.pincode || "").trim(),
                country: (formData.address.country || "India").trim()
            };

            const updateData = {
                storeName: formData.storeName.trim(),
                gstNumber: formData.gstNumber.trim(),
                address: address
            };

            await updateProfile(updateData);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
                <p className="text-gray-500">Manage your business account and preferences.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Tabs */}
                <div className="lg:w-64 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? "bg-primary-600 text-white shadow-md shadow-primary-200"
                                : "text-gray-500 hover:bg-slate-50 hover:text-gray-700"
                                }`}
                        >
                            <tab.icon className="text-xl" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                    {activeTab === "profile" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-4">Business Information</h3>
                            {!vendor ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">Loading vendor information...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                                        <input
                                            type="text"
                                            name="storeName"
                                            value={formData.storeName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Number</label>
                                        <input
                                            type="text"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="Enter GST number (optional)"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Business Address</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Street Address</label>
                                                <input
                                                    type="text"
                                                    name="address.street"
                                                    value={formData.address.street}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="Street Address"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Landmark (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="address.landmark"
                                                    value={formData.address.landmark}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="Landmark (Optional)"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">City *</label>
                                                <input
                                                    type="text"
                                                    name="address.city"
                                                    value={formData.address.city}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="City"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">State *</label>
                                                <input
                                                    type="text"
                                                    name="address.state"
                                                    value={formData.address.state}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="State"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Pincode</label>
                                                <input
                                                    type="text"
                                                    name="address.pincode"
                                                    value={formData.address.pincode}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="Pincode"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                                                <input
                                                    type="text"
                                                    name="address.country"
                                                    value={formData.address.country}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                                                    placeholder="Country"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}



                    {activeTab === "profile" && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={loading || !vendor}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
                            >
                                <FiSave /> {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorSettings;
