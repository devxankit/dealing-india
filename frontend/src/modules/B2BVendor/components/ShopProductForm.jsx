import { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiUpload, FiX, FiImage, FiTag, FiDollarSign, FiList, FiHome, FiLock, FiUnlock, FiEdit3 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";

const ShopProductForm = ({ onSubmit, isLoading = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        shopName: initialData?.name || "",
        description: initialData?.description || "",
        minPrice: initialData?.minPrice || "",
        maxPrice: initialData?.maxPrice || "",
        items: initialData?.items || [{ itemName: "", category: "", price: "", unit: "", reed: "", pick: "", panna: "", gsm: "", description: "", images: [] }],
        images: initialData?.images || [],
        shopUnitId: initialData?.shopUnitId || null,
    });

    const { vendor } = useB2BVendorAuthStore();
    const [hasExistingUnit, setHasExistingUnit] = useState(false);
    const [isShopLocked, setIsShopLocked] = useState(false); // New: Lock section A by default if exists
    const [isShopModified, setIsShopModified] = useState(false); // Track if Section A was changed
    const [originalShopData, setOriginalShopData] = useState(null); // To compare changes

    // Business types that should see Reed, Pick, Panna, GSM (Image 2 & 3)
    const techTypeAllowed = [
        "weavers",
        "gray broker",
        "other broker",
        "job work",
        "stitching unit",
        "support & services"
    ];
    const businessType = vendor?.businessType?.toLowerCase() || "";
    const showTechFields = techTypeAllowed.includes(businessType);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get('/b2b-vendor/shop-units');
                if (response.success && response.data) {
                    const unit = response.data;
                    const shopData = {
                        shopName: unit.name || "",
                        description: unit.description || "",
                        images: unit.images || [],
                        minPrice: unit.minPrice || "",
                        maxPrice: unit.maxPrice || "",
                        shopUnitId: unit._id
                    };
                    setFormData(prev => ({ ...prev, ...shopData }));
                    setOriginalShopData(shopData);
                    setHasExistingUnit(true);
                    setIsShopLocked(true); // Lock it by default
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

        // 1. Show preview immediately with blob URLs
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
        setIsShopModified(true); // Mark as modified on photo removal
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData({ ...formData, items: updatedItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemName: "", category: "", price: "", unit: "", reed: "", pick: "", panna: "", gsm: "", description: "", images: [] }]
        });
    };

    const handleItemImageUpload = async (itemIndex, e) => {
        const files = Array.from(e.target.files);
        const currentItemImages = formData.items[itemIndex].images || [];

        if (currentItemImages.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed per item`);
            return;
        }
        e.target.value = '';

        const blobUrls = files.map(f => URL.createObjectURL(f));
        const updatedItems = [...formData.items];
        const startCount = (updatedItems[itemIndex].images || []).length;
        updatedItems[itemIndex].images = [...(updatedItems[itemIndex].images || []), ...blobUrls];
        setFormData(prev => ({ ...prev, items: updatedItems }));

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
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                }
            };

            const base64Images = (await Promise.all(files.map(processFile))).filter(Boolean);

            setFormData(prev => {
                const items = [...prev.items];
                const imgList = [...(items[itemIndex].images || [])];
                for (let i = 0; i < base64Images.length; i++) imgList[startCount + i] = base64Images[i];
                items[itemIndex] = { ...items[itemIndex], images: imgList };
                return { ...prev, items };
            });

            blobUrls.forEach(url => URL.revokeObjectURL(url));
            toast.success('Images added to item', { id: toastId });
        } catch (error) {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
            setFormData(prev => {
                const items = [...prev.items];
                items[itemIndex] = {
                    ...items[itemIndex],
                    images: (items[itemIndex].images || []).slice(0, startCount)
                };
                return { ...prev, items };
            });
            toast.error('Failed to process item images', { id: toastId });
        }
    };

    const removeItemImage = (itemIndex, imgIndex) => {
        const updatedItems = [...formData.items];
        updatedItems[itemIndex].images = updatedItems[itemIndex].images.filter((_, i) => i !== imgIndex);
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.shopName || !formData.description || !formData.minPrice || !formData.maxPrice) {
            return toast.error("Please fill all fields in Section A");
        }

        if (Number(formData.maxPrice) < Number(formData.minPrice)) {
            return toast.error("Max Price cannot be less than Min Price");
        }

        const validItems = formData.items.every(item => {
            const basicValid = item.itemName && item.category && item.price && item.unit;
            if (showTechFields) {
                return basicValid && item.reed && item.pick && item.panna && item.gsm;
            }
            return basicValid;
        });

        if (!validItems) {
            return toast.error("Please fill all required item details in Section B");
        }

        if (formData.images.length === 0 && (!hasExistingUnit || isShopModified)) {
            return toast.error("Please upload at least one photo");
        }

        // Shop listing: send only required fields (no unit, moq, price, category, etc.)
        const payload = {
            formType: 'shop-listing',
            name: formData.shopName.trim(),
            description: formData.description,
            minPrice: String(formData.minPrice),
            maxPrice: String(formData.maxPrice),
            items: formData.items,
            images: formData.images,
        };
        if (formData.shopUnitId) payload.shopUnitId = formData.shopUnitId;

        // OPTIMIZATION: If shop already exists and wasn't modified, don't resend heavy data
        if (hasExistingUnit && !isShopModified) {
            delete payload.name;
            delete payload.images;
            delete payload.description;
            delete payload.minPrice;
            delete payload.maxPrice;
        }

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
                            Updating details below will sync across all your shop listings.
                        </p>
                    </div>
                </div>
            )}

            {/* SECTION A – SHOP LISTING */}
            <div className={sectionStyle}>
                <div className="flex items-center justify-between gap-2 mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                            <FiTag />
                        </div>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Shop Listing</h3>
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

                    {/* 2. Shop Name & Price Section Integrated */}
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
                </div>
            </div>

            {/* SECTION B – ITEM LISTING */}
            <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                        <FiList />
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Item Listing</h3>
                </div>

                <div className="space-y-4">
                    {formData.items.map((item, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={idx}
                            className="bg-slate-50 border border-gray-100 rounded-2xl relative group overflow-hidden p-6"
                        >
                            {formData.items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-xl shadow-sm border border-gray-100 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 z-10"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            )}

                            {/* Technical Specifications style: 2 separate boxes per row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name <span className="text-red-500">*</span></label>
                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                        <input
                                            required
                                            type="text"
                                            value={item.itemName}
                                            onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                                            placeholder="Item Name"
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category <span className="text-red-500">*</span></label>
                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                        <input
                                            required
                                            type="text"
                                            value={item.category}
                                            onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                                            placeholder="Category"
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹) <span className="text-red-500">*</span></label>
                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-bold">₹</span>
                                        <input
                                            required
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none pl-5 p-0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit <span className="text-red-500">*</span></label>
                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                        <input
                                            required
                                            type="text"
                                            value={item.unit}
                                            onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                                            placeholder="e.g. kg, pcs"
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                        />
                                    </div>
                                </div>
                                {showTechFields && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reed <span className="text-red-500">*</span></label>
                                            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                                <input
                                                    required
                                                    type="text"
                                                    value={item.reed}
                                                    onChange={(e) => handleItemChange(idx, "reed", e.target.value)}
                                                    placeholder="Example: 92"
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pick <span className="text-red-500">*</span></label>
                                            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                                <input
                                                    required
                                                    type="text"
                                                    value={item.pick}
                                                    onChange={(e) => handleItemChange(idx, "pick", e.target.value)}
                                                    placeholder="Example: 88"
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Panna / Width (Inch) <span className="text-red-500">*</span></label>
                                            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                                <input
                                                    required
                                                    type="text"
                                                    value={item.panna}
                                                    onChange={(e) => handleItemChange(idx, "panna", e.target.value)}
                                                    placeholder="Example: 44” / 60”"
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">GSM <span className="text-red-500">*</span></label>
                                            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                                <input
                                                    required
                                                    type="text"
                                                    value={item.gsm}
                                                    onChange={(e) => handleItemChange(idx, "gsm", e.target.value)}
                                                    placeholder="Example: 110/130/180"
                                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Item Description Field */}
                            <div className="mt-4 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Description</label>
                                <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                    <textarea
                                        rows={2}
                                        value={item.description || ""}
                                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                        placeholder="Enter Item Description (Optional)"
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none p-0 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Item Images Section */}
                            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block w-full mb-2">Item Photos (Max 5)</label>
                                {item.images?.map((img, imgIdx) => (
                                    <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 group">
                                        <img src={img} alt="item" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeItemImage(idx, imgIdx)}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiX size={10} />
                                        </button>
                                    </div>
                                ))}
                                {(!item.images || item.images.length < MAX_PHOTOS) && (
                                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:bg-white transition-all text-gray-400">
                                        <FiImage size={14} />
                                        <span className="text-[8px] font-bold uppercase">Add</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleItemImageUpload(idx, e)}
                                        />
                                    </label>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>


            </div>

            {/* ACTION BUTTON AT BOTTOM */}
            <div className="flex justify-end pt-8">
                <button
                    disabled={isLoading}
                    type="submit"
                    className={`w-full md:w-auto px-16 py-4 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 active:scale-95 ${isLoading
                        ? "opacity-30 cursor-not-allowed pointer-events-none grayscale"
                        : "hover:bg-primary-700 hover:shadow-primary-500/40"
                        }`}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Post Shop Listing</span>
                            <FiTag size={16} />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default ShopProductForm;
