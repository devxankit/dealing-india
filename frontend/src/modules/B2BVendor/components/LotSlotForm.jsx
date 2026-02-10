import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiImage, FiInfo, FiTag, FiDollarSign, FiList } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";

const LotSlotForm = ({ initialData, isEdit, id }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState(initialData || {
        name: "",
        category: "",
        subcategory: "",
        moq: 1,
        price: "", // Base Price / Expected price
        description: "",
        images: [],
        specifications: [{ name: "", value: "" }],
        bulkPricing: [{ minQty: "", price: "" }],
        brand: "",
        availability: "In Stock",
        unit: "Lot",
        pattern: "",
        fabric: ""
    });

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
        if (isEdit && id) {
            fetchLotSlotDetails();
        }
    }, [isEdit, id]);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await api.get('/public/b2b-categories');
            if (response.success && response.data) {
                const transformedCategories = response.data.map((cat, index) => ({
                    id: cat._id || cat.id || index.toString(),
                    name: cat.name,
                    subcategories: cat.subcategories || [],
                }));
                setCategories(transformedCategories);
            }
        } catch (error) {
            console.error('Error fetching B2B categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setCategoriesLoading(false);
        }
    };

    const fetchLotSlotDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/b2b-vendor/lot-slots/${id}`);
            if (response.success && response.data) {
                const data = response.data;
                setFormData({
                    name: data.name || "",
                    category: data.category || "",
                    subcategory: data.subcategory || "",
                    moq: data.moq || 1,
                    price: data.price || "",
                    description: data.description || "",
                    images: data.image ? [data.image, ...(data.images || [])] : (data.images || []),
                    specifications: data.specifications?.length > 0 ? data.specifications : [{ name: "", value: "" }],
                    bulkPricing: data.bulkPricing?.length > 0 ? data.bulkPricing : [{ minQty: "", price: "" }],
                    brand: data.brand || "",
                    availability: data.availability || "In Stock",
                    unit: data.unit || "Lot",
                    pattern: data.pattern || "",
                    fabric: data.fabric || ""
                });
            }
        } catch (error) {
            console.error('Error fetching lot/slot details:', error);
            toast.error('Failed to load listing details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (formData.category) {
            const selectedCategory = categories.find(cat => cat.name === formData.category);
            if (selectedCategory) {
                setSubcategories(selectedCategory.subcategories || []);
            } else {
                setSubcategories([]);
            }
        } else {
            setSubcategories([]);
        }
    }, [formData.category, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addSpec = () => {
        setFormData(prev => ({
            ...prev,
            specifications: [...prev.specifications, { name: "", value: "" }]
        }));
    };

    const removeSpec = (index) => {
        setFormData(prev => ({
            ...prev,
            specifications: prev.specifications.filter((_, i) => i !== index)
        }));
    };

    const updateSpec = (index, field, value) => {
        const updated = [...formData.specifications];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, specifications: updated }));
    };

    const addBulkTier = () => {
        setFormData(prev => ({
            ...prev,
            bulkPricing: [...prev.bulkPricing, { minQty: "", price: "" }]
        }));
    };

    const removeBulkTier = (index) => {
        setFormData(prev => ({
            ...prev,
            bulkPricing: prev.bulkPricing.filter((_, i) => i !== index)
        }));
    };

    const updateBulkTier = (index, field, value) => {
        const updated = [...formData.bulkPricing];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, bulkPricing: updated }));
    };

    const handleMultipleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsUploading(true);
        try {
            // Using base64 for now as per ProductForm's approach, or direct upload if preferred.
            // But let's stick to ProductForm's reader.readAsDataURL for consistency.
            const newImages = await Promise.all(
                files.map(file => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                })
            );

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }));
            toast.success(`${files.length} images added`);
        } catch (error) {
            toast.error("Failed to upload some images");
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.images.length === 0) {
            toast.error("Please upload at least one image");
            return;
        }

        if (!formData.name || !formData.price || !formData.moq || !formData.category) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                moq: parseInt(formData.moq) || 1,
                price: parseFloat(formData.price),
                specifications: formData.specifications.filter(spec => spec.name && spec.value),
                bulkPricing: formData.bulkPricing.filter(tier => tier.minQty && tier.price),
            };

            if (isEdit && id) {
                await api.put(`/b2b-vendor/lot-slots/${id}`, payload);
                toast.success("Listing updated successfully");
            } else {
                await api.post('/b2b-vendor/lot-slots', payload);
                toast.success("Lot/Slot listed successfully");
            }

            navigate("/b2b-vendor/lotslot/manage-lots");
        } catch (error) {
            console.error('Error saving lot/slot:', error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save listing";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Section: Details */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Basic Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-primary-50 text-primary-600 rounded-lg text-sm">
                                <FiTag />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Lot/Slot Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                    placeholder="e.g. Bulk Cotton Lot 500kg"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Brand / Manufacturer</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                    placeholder="e.g. Tata Steel"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Availability Status</label>
                                <select
                                    name="availability"
                                    value={formData.availability}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                    <option value="Available on Order">Available on Order</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Pattern</label>
                                <select
                                    name="pattern"
                                    value={formData.pattern || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                >
                                    <option value="">Select Pattern</option>
                                    {["Solid", "Striped", "Checked", "Floral", "Abstract", "Geometric", "Polka Dot", "Paisley", "Embroidered", "Printed"].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Fabric</label>
                                <select
                                    name="fabric"
                                    value={formData.fabric || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                >
                                    <option value="">Select Fabric</option>
                                    {["Cotton", "Silk", "Wool", "Polyester", "Linen", "Leather", "Denim", "Velvet", "Chiffon", "Georgette", "Rayon", "Nylon", "Satin"].map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Category <span className="text-red-500">*</span></label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    disabled={categoriesLoading}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none disabled:opacity-50"
                                >
                                    <option value="">{categoriesLoading ? "Loading categories..." : "Select Category"}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Subcategory</label>
                                <select
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    disabled={!formData.category || subcategories.length === 0}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none disabled:opacity-50"
                                >
                                    <option value="">Select Subcategory</option>
                                    {subcategories.map((sub, index) => (
                                        <option key={index} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </motion.div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                                <FiList />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Description</h3>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all resize-none outline-none"
                            placeholder="Provide a detailed description for bulk buyers..."
                        />
                    </div>

                    {/* Specifications */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm">
                                    <FiInfo />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Technical Specifications</h3>
                            </div>
                            <button
                                type="button"
                                onClick={addSpec}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs hover:bg-orange-100 transition-all uppercase tracking-wide"
                            >
                                <FiPlus /> Add Field
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {formData.specifications.map((spec, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        key={index}
                                        className="flex gap-3 group"
                                    >
                                        <div className="flex-1 grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-gray-100 group-hover:border-orange-100 group-hover:bg-white transition-all">
                                            <input
                                                type="text"
                                                value={spec.name}
                                                onChange={(e) => updateSpec(index, 'name', e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 outline-none"
                                                placeholder="Attribute (e.g. Material)"
                                            />
                                            <input
                                                type="text"
                                                value={spec.value}
                                                onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-xs text-gray-600 outline-none"
                                                placeholder="Value (e.g. 100% Pure Silk)"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSpec(index)}
                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {formData.specifications.length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm">
                                    No specifications added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section: Pricing & Images */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Media Gallery */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm">
                                    <FiImage />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Media Gallery</h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {formData.images.map((img, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-600 text-[7px] text-white font-bold uppercase rounded">
                                            Cover
                                        </div>
                                    )}
                                </div>
                            ))}
                            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-all group">
                                <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-purple-600 transition-all">
                                    {isUploading ? <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> : <FiPlus />}
                                </div>
                                <input type="file" onChange={handleMultipleImageUpload} className="hidden" multiple accept="image/*" disabled={isUploading} />
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            First image is cover. Max 300KB each.
                        </p>
                    </div>

                    {/* Pricing */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg text-sm">
                                <FiDollarSign />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">B2B Pricing</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Base Lot Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</div>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                        placeholder="45000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Min. Order (MOQ) <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        name="moq"
                                        value={formData.moq}
                                        onChange={handleChange}
                                        required
                                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                        placeholder="1"
                                    />
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="w-28 px-2 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-gray-700 text-xs"
                                    >
                                        <option value="">Unit</option>
                                        <option value="Lot">Lot</option>
                                        <option value="Slot">Slot</option>
                                        <option value="pieces">Pieces</option>
                                        <option value="pcs">PCS</option>
                                        <option value="nos">NOS</option>
                                        <option value="kg">Kilogram (Kg)</option>
                                        <option value="gram">Gram (g)</option>
                                        <option value="ton">Ton</option>
                                        <option value="meter">Meter (m)</option>
                                        <option value="cm">Centimeter (cm)</option>
                                        <option value="feet">Feet (ft)</option>
                                        <option value="yard">Yard</option>
                                        <option value="litre">Litre (L)</option>
                                        <option value="ml">Milliliter (ml)</option>
                                        <option value="gallon">Gallon</option>
                                        <option value="box">Box</option>
                                        <option value="pack">Pack</option>
                                        <option value="set">Set</option>
                                        <option value="pair">Pair</option>
                                        <option value="dozen">Dozen</option>
                                        <option value="carton">Carton</option>
                                        <option value="bundle">Bundle</option>
                                        <option value="roll">Roll</option>
                                        <option value="sheet">Sheet</option>
                                        <option value="sqft">Square Feet (sqft)</option>
                                        <option value="sqm">Square Meter (sqm)</option>
                                        <option value="Container">Container</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Volume Discounts</label>
                                    <button
                                        type="button"
                                        onClick={addBulkTier}
                                        className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <FiPlus /> Add Tier
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.bulkPricing.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-2 group">
                                            <div className="flex-1 grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-lg border border-gray-100 group-hover:bg-green-50/50 transition-all">
                                                <div className="flex items-center gap-1 px-1">
                                                    <span className="text-[8px] text-gray-400 font-bold">MIN</span>
                                                    <input
                                                        type="number"
                                                        value={tier.minQty}
                                                        onChange={(e) => updateBulkTier(index, 'minQty', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="10"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 px-1 border-l border-gray-200">
                                                    <span className="text-[8px] text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={tier.price}
                                                        onChange={(e) => updateBulkTier(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="42000"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeBulkTier(index)}
                                                className="p-1.5 text-red-400 hover:text-red-500"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 z-40 flex justify-end gap-3 shadow-lg">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                >
                    Discard
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 bg-primary-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-200 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <FiSave size={16} />
                            {isEdit ? 'Update listing' : 'Publish Lot/Slot'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default LotSlotForm;
