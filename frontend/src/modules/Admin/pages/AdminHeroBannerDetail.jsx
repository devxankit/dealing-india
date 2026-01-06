import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiCheckCircle,
    FiXCircle,
    FiCalendar,
    FiClock,
    FiUser,
    FiMail,
    FiPhone,
    FiExternalLink
} from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { formatPrice } from "../../../shared/utils/helpers";
import Badge from "../../../shared/components/Badge";
import {
    getAdminBannerBookingDetails,
    approveBannerBooking,
    rejectBannerBooking
} from "../../Vendor/services/heroBannerService";

const AdminHeroBannerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadBooking();
    }, [id]);

    const loadBooking = async () => {
        setLoading(true);
        try {
            const response = await getAdminBannerBookingDetails(id);
            setBooking(response.data);
        } catch (error) {
            console.error("Error loading booking details:", error);
            toast.error("Failed to load booking details");
            navigate("/admin/hero-banners");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm("Are you sure you want to approve this banner?")) return;

        setActionLoading(true);
        try {
            await approveBannerBooking(id);
            toast.success("Banner approved successfully");
            loadBooking();
        } catch (error) {
            console.error("Error approving banner:", error);
            toast.error(error.response?.data?.message || "Failed to approve banner");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt("Enter rejection reason:");
        if (reason === null) return; // Cancelled

        setActionLoading(true);
        try {
            await rejectBannerBooking(id, reason);
            toast.success("Banner rejected successfully");
            loadBooking();
        } catch (error) {
            console.error("Error rejecting banner:", error);
            toast.error(error.response?.data?.message || "Failed to reject banner");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!booking) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button
                onClick={() => navigate("/admin/hero-banners")}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
            >
                <FiArrowLeft /> Back to Banners
            </button>

            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900">Banner Booking Details</h1>
                        <Badge variant={booking.status === "active" ? "success" : booking.status === "pending" ? "warning" : "error"}>
                            {booking.status.toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-gray-500">Reference: {booking.referenceId}</p>
                </div>

                {booking.status === "pending" && booking.paymentStatus === "paid" && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FiXCircle /> Reject
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <FiCheckCircle /> Approve
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Banner Preview */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Banner Preview</h3>
                        <div className="aspect-[4/1] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 mb-4 relative group">
                            <img
                                src={booking.bannerImage}
                                alt={booking.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <a
                                    href={booking.bannerImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                >
                                    View Full Size
                                </a>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Title</p>
                                <p className="font-medium text-gray-900">{booking.title || "No Title"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Target URL</p>
                                <a
                                    href={booking.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 flex items-center gap-1 hover:underline truncate"
                                >
                                    {booking.link || "N/A"} <FiExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Booking Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <FiCalendar /> <span className="text-sm">Start Date</span>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {new Date(booking.startDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <FiClock /> <span className="text-sm">Duration</span>
                                </div>
                                <p className="font-medium text-gray-900">
                                    {booking.durationHours} hours
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <IndianRupee size={14} /> <span className="text-sm">Amount Paid</span>
                                </div>
                                <p className="font-medium text-gray-900 text-lg">
                                    {formatPrice(booking.amount)}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm font-bold">Slot</span>
                                </div>
                                <Badge variant="info">Slot {booking.slotId?.slotNumber || "N/A"}</Badge>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm">Payment Status</span>
                                </div>
                                <Badge variant={booking.paymentStatus === "paid" ? "success" : "error"}>
                                    {booking.paymentStatus.toUpperCase()}
                                </Badge>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <span className="text-sm">Created At</span>
                                </div>
                                <p className="text-sm text-gray-900">
                                    {new Date(booking.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Vendor Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Vendor Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiUser className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Business Name</p>
                                    <p className="font-medium text-gray-900">{booking.vendorId?.businessName || "N/A"}</p>
                                    <p className="text-xs text-gray-500">{booking.vendorId?.storeName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiMail className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900 break-all">{booking.vendorId?.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-blue-50 p-2 rounded-full">
                                    <FiPhone className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium text-gray-900">{booking.vendorId?.phone || "N/A"}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/admin/vendors/${booking.vendorId?._id}`)}
                                className="w-full mt-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                View Vendor Profile
                            </button>
                        </div>
                    </div>

                    {/* Transaction Info */}
                    {booking.paymentStatus === 'paid' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Payment Method</span>
                                    <span className="font-medium uppercase">{booking.paymentMethod || "Razorpay"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Payment ID</span>
                                    <span className="font-medium font-mono text-xs">{booking.razorpayPaymentId || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Order ID</span>
                                    <span className="font-medium font-mono text-xs">{booking.razorpayOrderId || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rejection Info */}
                    {booking.adminApprovalStatus === 'rejected' && (
                        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
                            <h3 className="text-lg font-bold text-red-900 mb-2">Rejection Reason</h3>
                            <p className="text-red-700">{booking.rejectionReason || "No reason provided"}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminHeroBannerDetail;
