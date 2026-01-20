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
                        <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl md:text-4xl font-black text-primary-600">V</span>
                        </div>
                    </div>
                    <div className="mb-12 md:mb-14">
                        <h1 className="text-xl md:text-3xl font-black text-white flex items-center gap-2 drop-shadow-md">
                            {vendor?.companyName || "Global Wholesale Hub"}
                            <FiCheckCircle className="text-white fill-green-500 text-base md:text-xl shrink-0" />
                        </h1>
                        <p className="text-white/90 text-sm md:text-base font-medium drop-shadow-sm">Verified Gold Batch B2B Vendor</p>
                    </div>
                </div>
                <button className="absolute top-4 right-4 md:top-auto md:bottom-10 md:right-10 flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white text-gray-800 text-sm md:text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    <FiEdit2 /> <span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                </button>
            </div>

            <div className="pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Contact Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMail /></div>
                                <span className="text-sm font-medium break-all">{vendor?.email || "sales@globalhub.com"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiPhone /></div>
                                <span className="text-sm font-medium">+91 98765-43210</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-slate-100 rounded-lg shrink-0"><FiMapPin /></div>
                                <span className="text-sm font-medium">Haryana, India</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Business Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-xl md:text-2xl font-black text-primary-600">124</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Vendors</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl">
                                <p className="text-xl md:text-2xl font-black text-primary-600">542</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Products</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">About Us</h3>
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                            We are a leading B2B vendor specializing in high-quality fashion and lifestyle products.
                            With over 10 years of experience in the B2B market, we provide competitive pricing
                            and reliable supply chains for vendors across the country. Our focus is on long-term
                            partnerships and sustainable growth for our business partners.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Business Compliance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">GST Type</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base">Regular Taxpayer</p>
                                </div>
                                <FiCheckCircle className="text-green-500 text-xl" />
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Verification</p>
                                    <p className="font-bold text-gray-700 text-sm md:text-base">Level 3 Certified</p>
                                </div>
                                <FiCheckCircle className="text-green-500 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default B2BVendorProfile;
