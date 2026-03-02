import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiPhone, FiMessageSquare, FiMapPin, FiUsers } from "react-icons/fi";
import api from "../../../shared/utils/api";

const CLICK_TYPES = {
    call: {
        label: "Call Visitors",
        icon: FiPhone,
        color: "text-emerald-600",
    },
    whatsapp: {
        label: "WhatsApp Visitors",
        icon: FiMessageSquare,
        color: "text-green-600",
    },
    map: {
        label: "Map Visitors",
        icon: FiMapPin,
        color: "text-orange-600",
    },
};

const B2BVendorContactAnalytics = ({ mode = "vendor" }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialType = searchParams.get("type");
    const normalizedType = initialType && CLICK_TYPES[initialType] ? initialType : "whatsapp";

    const [clickType, setClickType] = useState(normalizedType);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (clickType !== normalizedType) {
            setSearchParams({ type: clickType });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clickType]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const isAdmin = mode === "admin" && id;
                const url = isAdmin
                    ? `/admin/analytics/vendor-contact/${id}/click-users`
                    : "/vendor/analytics/click-users";

                const response = await api.get(url, {
                    params: { clickType, page: 1, limit: 100 },
                });
                if (response?.success) {
                    setItems(response.data?.items || []);
                } else {
                    setError(response?.message || "Failed to load visitors");
                }
            } catch (e) {
                setError(e?.message || "Failed to load visitors");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clickType]);

    const currentMeta = CLICK_TYPES[clickType] || CLICK_TYPES.whatsapp;
    const CurrentIcon = currentMeta.icon;

    return (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-0 pb-20 pt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={() =>
                        mode === "admin" && id
                            ? navigate(`/admin/b2b-vendors/manage/${id}/dashboard`)
                            : navigate("/b2b-vendor/dashboard")
                    }
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                >
                    <FiArrowLeft size={16} />
                    Back to Dashboard
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center`}>
                            <CurrentIcon className={currentMeta.color} size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">
                                {currentMeta.label}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Same user same date • shown once
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                        {Object.entries(CLICK_TYPES).map(([key, meta]) => {
                            const ActiveIcon = meta.icon;
                            const isActive = clickType === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setClickType(key)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900"
                                        }`}
                                >
                                    <ActiveIcon size={12} />
                                    {key}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                            Loading visitors...
                        </div>
                    ) : error ? (
                        <div className="py-10 text-center">
                            <p className="text-xs font-black text-red-600 uppercase tracking-widest">{error}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                            No visitors found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((row, idx) => (
                                <div
                                    key={`${row?.dateKey || "date"}-${row?.user?._id || idx}`}
                                    className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                                                <FiUsers size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {row.dateKey} • {row.clickCount || 1} click
                                                    {(row.clickCount || 1) > 1 ? "s" : ""}
                                                </p>
                                                <p className="text-sm font-black text-slate-900 mt-1">
                                                    {row.user?.name || "Unknown User"}
                                                </p>
                                                <div className="mt-2 space-y-1">
                                                    {row.user?.phone && (
                                                        <p className="text-xs font-bold text-slate-700">{row.user.phone}</p>
                                                    )}
                                                    {row.user?.email && (
                                                        <p className="text-xs font-bold text-slate-500">{row.user.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Last
                                            </p>
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                                {row.lastClickAt
                                                    ? new Date(row.lastClickAt).toLocaleString("en-GB")
                                                    : "--"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default B2BVendorContactAnalytics;

