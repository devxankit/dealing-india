import { useState } from "react";
import { FiUser, FiBell, FiLock, FiShield, FiSave } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const B2BVendorSettings = () => {
    const [activeTab, setActiveTab] = useState("profile");

    const tabs = [
        { id: "profile", label: "Business Profile", icon: FiUser },
        { id: "notifications", label: "Notifications", icon: FiBell },
        { id: "security", label: "Security", icon: FiShield },
    ];

    const handleSave = () => {
        toast.success("Settings updated successfully!");
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name</label>
                                    <input type="text" defaultValue="Antigravity Wholesale" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">GST Number</label>
                                    <input type="text" defaultValue="22AAAAA0000A1Z5" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Business Address</label>
                                    <textarea rows={3} defaultValue="123 Bulk Market, Cyber City, Gurgaon, India" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-4">Notification Preferences</h3>
                            <div className="space-y-4">
                                {[
                                    { title: "New Inquiries", desc: "Get notified when a vendor sends a message." },
                                    { title: "Product Stock Alerts", desc: "Notify when your listed stock is running low." },
                                    { title: "Marketing Updates", desc: "Receive news about B2B features and promotions." },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                            <p className="text-xs text-gray-500">{item.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-4">Security Settings</h3>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                                    <input type="password" underline className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                    <input type="password" underline className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                                    <input type="password" underline className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md">
                            <FiSave /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorSettings;
