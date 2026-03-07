import { useState, useEffect } from "react";
import { FiUpload, FiX, FiTag, FiHome, FiLock, FiUnlock, FiEdit3, FiSave, FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";

const ShopListingForm = ({ onSubmit, isLoading = false }) => {
    const [formData, setFormData] = useState({
        shopName: "",
        description: "",
        businessCategory: "",
        mapUrl: "",
        minPrice: "",
        maxPrice: "",
        images: [],
        details: [{ name: "", post: "", mobile: "" }],
        shopUnitId: null,
    });

    const BUSINESS_CATEGORIES = ['Manufacturing', 'Exporter', 'Wholesaler', 'Semi wholesaler', 'Retailers', 'Trading', 'Traders', 'Agency', 'Supplier', 'Developer', 'Property'];

    const { vendor } = useB2BVendorAuthStore();
    const [hasExistingUnit, setHasExistingUnit] = useState(false);
    const [isShopLocked, setIsShopLocked] = useState(false);
    const [isShopModified, setIsShopModified] = useState(false);
    const [originalShopData, setOriginalShopData] = useState(null);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get('/b2b-vendor/shop-units');
                if (response.success && response.data) {
                    const unit = response.data;
                    const shopData = {
                        shopName: unit.name || "",
                        description: unit.description || "",
                        businessCategory: unit.businessCategory || "",
                        mapUrl: unit.mapUrl || "",
                        images: unit.images || [],
                        minPrice: unit.minPrice || "",
                        maxPrice: unit.maxPrice || "",
                        details: unit.details?.length > 0 ? unit.details : [{ name: "", post: "", mobile: "" }],
                        shopUnitId: unit._id
                    };
                    setFormData(prev => ({ ...prev, ...shopData }));
                    setOriginalShopData(shopData);
                    setHasExistingUnit(true);
                    setIsShopLocked(true);
                    setIsShopModified(false);
                }
            } catch (err) {
                console.error("Failed to fetch unit:", err);
            }
        };
        fetchUnit();
    }, []);

    const MAX_PHOTOS = 5;

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (formData.images.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }
        e.target.value = '';

        const blobUrls = files.map(f => URL.createObjectURL(f));
        const startCount = formData.images.length;
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...blobUrls]
        }));
        setIsShopModified(true);

        const toastId = toast.loading('Processing images...');

        try {
            const processFile = async (file) => {
                if (!file.type.startsWith('image/')) return null;
                try {
                    const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
                    const compressed = await imageCompression(file, options);
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(compressed);
                    });
                } catch (err) {
                    console.error('Compression error:', err);
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                }
            };

            const base64Images = (await Promise.all(files.map(processFile))).filter(Boolean);

            setFormData(prev => {
                const next = [...prev.images];
                for (let i = 0; i < base64Images.length; i++) {
                    next[startCount + i] = base64Images[i];
                }
                return { ...prev, images: next };
            });

            blobUrls.forEach(url => URL.revokeObjectURL(url));
            toast.success('Images added successfully', { id: toastId });
        } catch (error) {
            console.error('Error processing images:', error);
            blobUrls.forEach(url => URL.revokeObjectURL(url));
            setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i < startCount) }));
            toast.error('Failed to process images', { id: toastId });
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
        setIsShopModified(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.shopName || !formData.description || !formData.minPrice || !formData.maxPrice) {
            return toast.error("Please fill all required fields");
        }

        if (Number(formData.maxPrice) < Number(formData.minPrice)) {
            return toast.error("Max Price cannot be less than Min Price");
        }

        if (formData.images.length === 0 && (!hasExistingUnit || isShopModified)) {
            return toast.error("Please upload at least one photo");
        }

        const payload = {
            name: formData.shopName.trim(),
            description: formData.description,
            businessCategory: formData.businessCategory || undefined,
            mapUrl: formData.mapUrl || undefined,
            minPrice: String(formData.minPrice),
            maxPrice: String(formData.maxPrice),
            images: formData.images,
            details: formData.details.filter(d => d.name || d.post || d.mobile),
        };

        onSubmit(payload);
    };

    // Styling constants matching ProductForm.jsx
    const inputStyle = "w-full px-4 py-3 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-medium text-gray-700 placeholder:text-gray-400 shadow-sm";
    const labelStyle = "block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 ml-1";
    const sectionStyle = "bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6";

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-24 px-4 text-left">
            {hasExistingUnit && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                        <FiHome size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Active Shop Profile Found</h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">
                            You can update your shop details below.
                        </p>
                    </div>
                </div>
            )}

            {/* SHOP LISTING FORM */}
            <div className={sectionStyle}>
                <div className="flex items-center justify-between gap-2 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                            <FiTag />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Shop Details</h3>
                    </div>
                    {hasExistingUnit && (
                        <button
                            type="button"
                            onClick={() => setIsShopLocked(!isShopLocked)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isShopLocked
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                } shadow-sm border border-transparent`}
                        >
                            {isShopLocked ? (
                                <>
                                    <FiLock size={14} />
                                    <span>Edit Shop Details</span>
                                </>
                            ) : (
                                <>
                                    <FiUnlock size={14} />
                                    <span>Lock Details</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className={`space-y-8 transition-all duration-500 overflow-hidden ${isShopLocked ? "opacity-60 grayscale pointer-events-none max-h-[140px]" : "opacity-100 max-h-[2000px]"}`}>
                    {/* 1. Photo Upload Field */}
                    <div className="space-y-4">
                        <label className={labelStyle}>
                            Photo Upload (Max {MAX_PHOTOS}) <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <AnimatePresence>
                                {formData.images.map((img, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        key={idx}
                                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group shadow-sm"
                                    >
                                        <img src={img} alt="Shop" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {formData.images.length < MAX_PHOTOS && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 transition-all text-gray-400 group">
                                    <FiUpload size={22} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* 2. Shop Name & Price Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className={labelStyle}>Shop Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={formData.shopName}
                                onChange={(e) => {
                                    setFormData({ ...formData, shopName: e.target.value });
                                    setIsShopModified(true);
                                }}
                                placeholder="Enter Shop Name"
                                className={inputStyle}
                            />
                        </div>

                    <div className="space-y-2">
                        <label className={labelStyle}>Business Category</label>
                        <select
                            value={formData.businessCategory}
                            onChange={(e) => {
                                setFormData({ ...formData, businessCategory: e.target.value });
                                setIsShopModified(true);
                            }}
                            className={inputStyle}
                        >
                            <option value="">Select Business Category</option>
                            {BUSINESS_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className={labelStyle}>Location URL (Google Maps)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={formData.mapUrl}
                                onChange={(e) => {
                                    setFormData({ ...formData, mapUrl: e.target.value });
                                    setIsShopModified(true);
                                }}
                                placeholder="https://maps.google.com/..."
                                className={`${inputStyle} flex-1`}
                            />
                        </div>
                    </div>

                        <div className="space-y-2">
                            <label className={labelStyle}>Manual Price Range <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                    <input
                                        required
                                        type="number"
                                        value={formData.minPrice}
                                        onChange={(e) => {
                                            setFormData({ ...formData, minPrice: e.target.value });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Min"
                                        className={inputStyle.replace("px-4", "pl-8 pr-4")}
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                    <input
                                        required
                                        type="number"
                                        value={formData.maxPrice}
                                        onChange={(e) => {
                                            setFormData({ ...formData, maxPrice: e.target.value });
                                            setIsShopModified(true);
                                        }}
                                        placeholder="Max"
                                        className={inputStyle.replace("px-4", "pl-8 pr-4")}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Description Field */}
                    <div className="space-y-2">
                        <label className={labelStyle}>Description <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={(e) => {
                                setFormData({ ...formData, description: e.target.value });
                                setIsShopModified(true);
                            }}
                            placeholder="Enter Description"
                            className={inputStyle + " resize-none min-h-[120px]"}
                        />
                    </div>

                    {/* 4. Details Section (Name, Post, Mobile) */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className={labelStyle}>Staff / Contact Details</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({ ...formData, details: [...formData.details, { name: "", post: "", mobile: "" }] });
                                    setIsShopModified(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-all border border-primary-100 shadow-sm"
                            >
                                <FiPlus size={12} />
                                Add Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.details.map((detail, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end group/row bg-slate-50/50 p-4 rounded-xl border border-transparent hover:border-slate-200 transition-all"
                                >
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Name</label>
                                        <input
                                            type="text"
                                            value={detail.name}
                                            onChange={(e) => {
                                                const newDetails = [...formData.details];
                                                newDetails[idx].name = e.target.value;
                                                setFormData({ ...formData, details: newDetails });
                                                setIsShopModified(true);
                                            }}
                                            placeholder="Enter Name"
                                            className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                        />
                                    </div>
                                    <div className="sm:col-span-4 space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Post / Role</label>
                                        <input
                                            type="text"
                                            value={detail.post}
                                            onChange={(e) => {
                                                const newDetails = [...formData.details];
                                                newDetails[idx].post = e.target.value;
                                                setFormData({ ...formData, details: newDetails });
                                                setIsShopModified(true);
                                            }}
                                            placeholder="Enter Post"
                                            className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                        />
                                    </div>
                                    <div className="sm:col-span-3 space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile</label>
                                        <input
                                            type="text"
                                            value={detail.mobile}
                                            onChange={(e) => {
                                                const newDetails = [...formData.details];
                                                newDetails[idx].mobile = e.target.value;
                                                setFormData({ ...formData, details: newDetails });
                                                setIsShopModified(true);
                                            }}
                                            placeholder="Mobile No."
                                            className={inputStyle.replace("py-3", "py-2.5 text-sm")}
                                        />
                                    </div>
                                    <div className="sm:col-span-1 pb-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (formData.details.length === 1) {
                                                    setFormData({ ...formData, details: [{ name: "", post: "", mobile: "" }] });
                                                } else {
                                                    setFormData({ ...formData, details: formData.details.filter((_, i) => i !== idx) });
                                                }
                                                setIsShopModified(true);
                                            }}
                                            className="w-full h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Remove Row"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTON AT BOTTOM */}
            <div className="flex justify-end pt-8">
                <button
                    disabled={isLoading || (hasExistingUnit && isShopLocked && !isShopModified)}
                    type="submit"
                    className={`w-full md:w-auto px-16 py-4 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95 ${(isLoading || (hasExistingUnit && isShopLocked && !isShopModified))
                        ? "opacity-30 cursor-not-allowed pointer-events-none grayscale"
                        : "hover:bg-primary-700 hover:shadow-primary-500/40"
                        }`}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{hasExistingUnit ? "Update Shop" : "Create Shop"}</span>
                            <FiSave size={16} />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default ShopListingForm;
