import { FiMapPin, FiPhone, FiMail, FiEdit2, FiCheckCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";

const B2BVendorProfile = () => {
    const { vendor } = useB2BVendorAuthStore();

    return (

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Cover/Header Section */}
            <div className="relative h-48 md:h-64 bg-slate-200 rounded-3xl overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-primary-900/40" />
                <div className="absolute -bottom-10 md:-bottom-12 left-4 md:left-10 flex items-end gap-4 md:gap-6">
                    <div className="w-28 h-28 md:w-40 md:h-40 rounded-3xl bg-white p-2 shadow-xl border-4 border-white overflow-hidden shrink-0">
                        {vendor?.storeLogo ? (
                            <img src={vendor.storeLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl md:text-4xl font-black text-primary-600">{vendor?.name?.charAt(0) || "V"}</span>
                            </div>
                        )}
                    </div>
                    <div className="mb-12 md:mb-14">
                        <h1 className="text-xl md:text-3xl font-black text-white flex items-center gap-2 drop-shadow-md">
                            {vendor?.storeName || vendor?.companyName || vendor?.name}
                            <FiCheckCircle className="text-white fill-green-500 text-base md:text-xl shrink-0" />
                        </h1>
                        <p className="text-white/90 text-sm md:text-base font-medium drop-shadow-sm">Verified B2B Vendor</p>
                    </div>
                </div>
                {/* <button className="absolute top-4 right-4 md:top-auto md:bottom-10 md:right-10 flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white text-gray-800 text-sm md:text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <FiEdit2 /> <span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                </button> */}
            </div>

            <div className="pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Contact Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMail /></div>
                                <span className="text-sm font-medium break-all">{vendor?.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiPhone /></div>
                                <span className="text-sm font-medium">{vendor?.phone}</span>
                            </div>
                            {vendor?.address && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMapPin /></div>
                                    <span className="text-sm font-medium">
                                        {vendor.address.city}, {vendor.address.state}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Business Identity</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Business Type</p>
                                <p className="font-bold text-gray-800">{vendor?.businessType || 'N/A'}</p>
                            </div>
                            
                            {vendor?.gstNumber && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">GST Number</p>
                                    <p className="font-mono font-bold text-gray-800 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                                        {vendor.gstNumber}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">About Us</h3>
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line">
                            {vendor?.storeDescription || "No description provided."}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Business Compliance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Verification Status</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base capitalize">{vendor?.status || 'Pending'}</p>
                                </div>
                                <FiCheckCircle className={`text-xl ${vendor?.status === 'Active' ? 'text-green-500' : 'text-amber-500'}`} />
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vendor Plan</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base">
                                        {vendor?.currentSubscription ? "Active Subscription" : "Standard"}
                                    </p>
                                </div>
                                <FiCheckCircle className="text-blue-500 text-xl" />
                            </div>
                        </div>
                    </div>

                    {vendor?.address && (
                        <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Location</h3>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="font-bold text-gray-800 mb-1 uppercase tracking-tight">
                                    {[vendor.address.street, vendor.address.market, vendor.address.landmark].filter(Boolean).join(', ')}
                                </p>
                                <p className="text-gray-600 text-sm uppercase">
                                    {[vendor.address.area, vendor.address.city, vendor.address.state].filter(Boolean).join(', ')}
                                    {vendor.address.country && ` (${vendor.address.country})`}
                                    {vendor.address.pincode && ` - ${vendor.address.pincode}`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorProfile;
