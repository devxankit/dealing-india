import { FiMapPin, FiPhone, FiMail, FiEdit2, FiCheckCircle, FiCopy, FiShare2, FiShield, FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getMyReferralSummary } from "../../../shared/services/referralService";
import { useNavigate } from "react-router-dom";
import { handleShare } from "../../../shared/utils/share";

const B2BVendorProfile = () => {
    const { vendor } = useB2BVendorAuthStore();
    const navigate = useNavigate();
    const [referralData, setReferralData] = useState(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState("");

    useEffect(() => {
        const loadReferral = async () => {
            setReferralLoading(true);
            setReferralError("");
            try {
                const data = await getMyReferralSummary();
                setReferralData(data);
            } catch (error) {
                console.error("Failed to load vendor referral summary:", error);
                setReferralError(error?.response?.data?.message || error?.message || "Unable to load referral details");
            } finally {
                setReferralLoading(false);
            }
        };

        if (vendor?._id) {
            loadReferral();
        }
    }, [vendor?._id]);

    const handleShareReferral = async () => {
        if (!referralData?.referralLink) return;
        await handleShare({
            title: "Join Dealing India",
            text: `Join Dealing India using my referral code: ${referralData.referralCode}\nDownload App: https://play.google.com/store/apps/details?id=com.dealingindia.app`
        });
    };

    const copyReferralLink = async () => {
        if (!referralData?.referralLink) return;
        try {
            const shareText = `Join Dealing India using my referral code: ${referralData.referralCode}\nDownload App: https://play.google.com/store/apps/details?id=com.dealingindia.app`;
            await navigator.clipboard.writeText(shareText);
            toast.success("Referral link copied");
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

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
                <button
                    onClick={() => navigate("/b2b-vendor/settings/profile")}
                    className="absolute top-4 right-4 md:top-auto md:bottom-10 md:right-10 flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white text-gray-800 text-sm md:text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
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

                    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Legal & Policies</h3>
                        <button 
                            onClick={() => navigate('/terms?type=vendor')}
                            className="w-full p-4 border border-gray-100 rounded-xl flex items-center justify-between group hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-primary-600 transition-colors">
                                    <FiShield size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-700 text-sm md:text-base">Terms & Conditions</p>
                                    <p className="text-[10px] font-medium text-gray-400">Review platform legal and operational guidelines</p>
                                </div>
                            </div>
                            <FiArrowRight className="text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                        </button>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 md:p-6 text-white shadow-sm">
                        <h3 className="text-lg font-bold mb-2">Referral Program</h3>
                        <p className="text-sm font-semibold">Code: {referralData?.referralCode || "Not available"}</p>
                        <p className="text-sm text-emerald-100 mt-1">Referrals: {referralData?.referralCount || 0} | Wallet Points: {referralData?.wallet?.pointsBalance || 0}</p>
                        {referralLoading && <p className="text-xs text-emerald-100 mt-2">Loading referral details...</p>}
                        {referralError && (
                            <p className="text-xs text-amber-100 mt-2">
                                {referralError}. Restart backend and refresh this page.
                            </p>
                        )}
                        {!referralData?.milestoneUnlocked && !referralLoading && (
                            <p className="text-xs text-emerald-100 mt-2">
                                Refer {Math.max((referralData?.milestoneThreshold || 10) - (referralData?.referralCount || 0), 0)} more users to unlock higher rewards.
                            </p>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={copyReferralLink}
                                disabled={!referralData?.referralLink}
                                className="px-3 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiCopy /> Copy Link
                            </button>
                            <button
                                onClick={handleShareReferral}
                                disabled={!referralData?.referralLink}
                                className="px-3 py-2 rounded-xl bg-emerald-900/30 text-white text-xs font-bold flex items-center gap-2 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiShare2 /> Share
                            </button>
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
