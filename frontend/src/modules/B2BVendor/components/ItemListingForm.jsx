import { useState, useEffect } from "react";
import { FiX, FiImage, FiList, FiTag } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";

const ItemListingForm = ({ onSubmit, isLoading = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        items: initialData?.items?.slice(0, 1) || [{ itemName: "", category: "", price: "", unit: "", reed: "", pick: "", panna: "", gsm: "", description: "", images: [] }],
        shopUnitId: initialData?.shopUnitId || null,
    });

    const { vendor } = useB2BVendorAuthStore();
    const [shopUnit, setShopUnit] = useState(null);

    // Business types that should see Reed, Pick, Panna, GSM
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

    // Fetch the existing shop unit for reference (read-only display)
    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const response = await api.get('/b2b-vendor/shop-units');
                if (response.success && response.data) {
                    const unit = response.data;
                    setShopUnit(unit);
                    setFormData(prev => ({ ...prev, shopUnitId: unit._id }));
                }
            } catch (err) {
                // Shop unit may not exist yet or feature may be disabled
                console.log("No shop unit found:", err?.message);
            }
        };
        fetchUnit();
    }, []);

    const MAX_PHOTOS = 5;

    const handleItemChange = (field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[0][field] = value;
        setFormData({ ...formData, items: updatedItems });
    };

    const handleItemImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        const currentItemImages = formData.items[0].images || [];

        if (currentItemImages.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed per item`);
            return;
        }
        e.target.value = '';

        const blobUrls = files.map(f => URL.createObjectURL(f));
        const updatedItems = [...formData.items];
        const startCount = (updatedItems[0].images || []).length;
        updatedItems[0].images = [...(updatedItems[0].images || []), ...blobUrls];
        setFormData(prev => ({ ...prev, items: updatedItems }));

        const toastId = toast.loading('Processing images...');

        try {
            const processFile = async (file) => {
                if (!file.type.startsWith('image/')) return null;
                try {
                    const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true };
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
                const imgList = [...(items[0].images || [])];
                for (let i = 0; i < base64Images.length; i++) imgList[startCount + i] = base64Images[i];
                items[0] = { ...items[0], images: imgList };
                return { ...prev, items };
            });

            blobUrls.forEach(url => URL.revokeObjectURL(url));
            toast.success('Images added to item', { id: toastId });
        } catch (error) {
            blobUrls.forEach(url => URL.revokeObjectURL(url));
            setFormData(prev => {
                const items = [...prev.items];
                items[0] = {
                    ...items[0],
                    images: (items[0].images || []).slice(0, startCount)
                };
                return { ...prev, items };
            });
            toast.error('Failed to process item images', { id: toastId });
        }
    };

    const removeItemImage = (imgIndex) => {
        const updatedItems = [...formData.items];
        updatedItems[0].images = updatedItems[0].images.filter((_, i) => i !== imgIndex);
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const item = formData.items[0];
        const basicValid = item.itemName && item.category && item.price && item.unit;
        let isValid = basicValid;
        if (showTechFields) {
            isValid = basicValid && item.reed && item.pick && item.panna && item.gsm;
        }

        if (!isValid) {
            return toast.error("Please fill all required item details");
        }

        const payload = {
            formType: 'shop-listing',
            items: formData.items,
        };
        if (formData.shopUnitId) payload.shopUnitId = formData.shopUnitId;

        onSubmit(payload);
    };

    // Styling constants matching ProductForm.jsx
    const inputStyle = "w-full px-4 py-3 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-medium text-gray-700 placeholder:text-gray-400 shadow-sm";
    const labelStyle = "block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 ml-1";
    const sectionStyle = "bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6";

    const item = formData.items[0];

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-24 px-4 text-left">
            {/* Shop Unit Summary (Read Only) */}
            {shopUnit && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                        <FiTag size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">
                            Shop: {shopUnit.name}
                        </h4>
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-1">
                            Items will be linked to your existing shop profile • ₹{shopUnit.minPrice} - ₹{shopUnit.maxPrice}
                        </p>
                    </div>
                </div>
            )}

            {!shopUnit && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm">
                        <FiTag size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">No Shop Profile Found</h4>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1">
                            Please create a Shop Listing first from the Shop Listing section in the sidebar.
                        </p>
                    </div>
                </div>
            )}

            {/* ITEM LISTING */}
            <div className={sectionStyle}>
                <div className="flex items-center gap-2 mb-8">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                        <FiList />
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Item Listing</h3>
                </div>

                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-50 border border-gray-100 rounded-2xl relative group overflow-hidden p-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name <span className="text-red-500">*</span></label>
                                <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-blue-500 transition-all">
                                    <input
                                        required
                                        type="text"
                                        value={item.itemName}
                                        onChange={(e) => handleItemChange("itemName", e.target.value)}
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
                                        onChange={(e) => handleItemChange("category", e.target.value)}
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
                                        onChange={(e) => handleItemChange("price", e.target.value)}
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
                                        onChange={(e) => handleItemChange("unit", e.target.value)}
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
                                                onChange={(e) => handleItemChange("reed", e.target.value)}
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
                                                onChange={(e) => handleItemChange("pick", e.target.value)}
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
                                                onChange={(e) => handleItemChange("panna", e.target.value)}
                                                placeholder='Example: 44" / 60"'
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
                                                onChange={(e) => handleItemChange("gsm", e.target.value)}
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
                                    onChange={(e) => handleItemChange("description", e.target.value)}
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
                                        onClick={() => removeItemImage(imgIdx)}
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
                                        onChange={(e) => handleItemImageUpload(e)}
                                    />
                                </label>
                            )}
                        </div>
                    </motion.div>
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
                            <span>{initialData ? "Update Item Listing" : "Post Item Listing"}</span>
                            <FiList size={16} />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default ItemListingForm;
