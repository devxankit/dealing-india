import { useState, useEffect } from "react";
import { FiUser, FiBell, FiLock, FiShield, FiSave } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";

const B2BVendorSettings = () => {
    const { vendor, updateProfile } = useB2BVendorAuthStore();
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        storeName: "",
        gstNumber: "",
        businessAddress: ""
    });

    // Initialize form data from vendor
    useEffect(() => {
        if (vendor) {
            // Format address as string
            const address = vendor.address || {};
            const addressParts = [
                address.street,
                address.landmark,
                address.city,
                address.state,
                address.pincode || address.zipCode,
                address.country
            ].filter(Boolean);
            const formattedAddress = addressParts.join(", ");

            setFormData({
                storeName: vendor.storeName || "",
                gstNumber: vendor.gstNumber || "",
                businessAddress: formattedAddress || ""
            });
        }
    }, [vendor]);

    const tabs = [
        { id: "profile", label: "Business Profile", icon: FiUser },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
            // Parse address string back to object
            const addressParts = formData.businessAddress.split(",").map(part => part.trim());
            const address = {
                street: addressParts[0] || "",
                landmark: addressParts[1] || "",
                city: addressParts[2] || "",
                state: addressParts[3] || "",
                pincode: addressParts[4] || "",
                country: addressParts[5] || "India"
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

            <div className="flex flex-col lg:flex-row gap-8">
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
                <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    {activeTab === "profile" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-4">Business Information</h3>
                            {!vendor ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">Loading vendor information...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            name="storeName"
                                            value={formData.storeName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">GST Number</label>
                                        <input
                                            type="text"
                                            name="gstNumber"
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                            placeholder="Enter GST number (optional)"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Business Address</label>
                                        <textarea
                                            rows={3}
                                            name="businessAddress"
                                            value={formData.businessAddress}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
                                            placeholder="Street, Landmark, City, State, Pincode, Country"
                                        />
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
                                className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
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
