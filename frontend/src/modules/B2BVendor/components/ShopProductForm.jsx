import { useState } from "react";
import { FiPlus, FiTrash2, FiUpload, FiX, FiImage, FiTag, FiDollarSign, FiList } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const ShopProductForm = ({ onSubmit, isLoading = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        unitName: initialData?.name || "",
        description: initialData?.description || "",
        minPrice: initialData?.minPrice || "",
        maxPrice: initialData?.maxPrice || "",
        items: initialData?.items || [{ itemName: "", category: "", price: "", unit: "" }],
        images: initialData?.images || [],
    });

    const MAX_PHOTOS = 5;

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (formData.images.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, reader.result]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData({ ...formData, items: updatedItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemName: "", category: "", price: "", unit: "" }]
        });
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

        if (!formData.unitName || !formData.description || !formData.minPrice || !formData.maxPrice) {
            return toast.error("Please fill all fields in Section A");
        }

        if (Number(formData.maxPrice) < Number(formData.minPrice)) {
            return toast.error("Max Price cannot be less than Min Price");
        }

        const validItems = formData.items.every(item => item.itemName && item.category && item.price && item.unit);
        if (!validItems) {
            return toast.error("Please fill all item details in Section B");
        }

        if (formData.images.length === 0) {
            return toast.error("Please upload at least one photo");
        }

        onSubmit({
            ...formData,
            formType: 'shop-listing',
            name: formData.unitName,
        });
    };

    // Styling constants matching ProductForm.jsx
    const inputStyle = "w-full px-4 py-3 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-medium text-gray-700 placeholder:text-gray-400 shadow-sm";
    const labelStyle = "block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 ml-1";
    const sectionStyle = "bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6";

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-24 px-4 text-left">
            {/* SECTION A – SHOP LISTING */}
            <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                        <FiTag />
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Shop Listing</h3>
                </div>

                <div className="space-y-8">
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

                    {/* 2. Unit Name & Price Section Integrated */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className={labelStyle}>Unit Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={formData.unitName}
                                onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                                placeholder="Enter Unit Name"
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
                                        onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
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
                                        onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
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
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                            </div>
                        </motion.div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addItem}
                    className="w-full mt-6 py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold uppercase tracking-widest text-xs hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <FiPlus /> + Add More Item
                </button>
            </div>

            {/* ACTION BUTTON AT BOTTOM */}
            <div className="flex justify-end pt-8">
                <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full md:w-auto px-16 py-4 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
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
