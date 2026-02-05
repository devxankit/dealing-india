import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiImage, FiInfo, FiTag, FiDollarSign, FiList } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";

const B2BVendorProductForm = ({ initialData, isEdit, productId }) => {
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
        unit: "",
        color: "",
        pattern: "",
        fabric: ""
    });

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await api.get('/public/b2b-categories');
            if (response.success && response.data) {
                // Transform backend format to frontend format
                const transformedCategories = response.data.map((cat, index) => ({
                    id: cat._id || cat.id || index.toString(),
                    name: cat.name,
                    subcategories: cat.subcategories || [],
                }));
                setCategories(transformedCategories);
            } else {
                // Fallback to empty array if API fails
                setCategories([]);
            }
        } catch (error) {
            console.error('Error fetching B2B categories:', error);
            toast.error('Failed to load categories');
            setCategories([]);
        } finally {
            setCategoriesLoading(false);
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

        if (formData.images.length + files.length > 5) {
            toast.error("Maximum 5 images allowed");
            return;
        }

        setIsUploading(true);
        try {
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
            toast.error("Please upload at least one product image");
            return;
        }

        if (!formData.name || !formData.price || !formData.moq) {
            toast.error("Please fill in all required fields (Name, Price, MOQ)");
            return;
        }

        setLoading(true);
        try {
            // Prepare data for API
            const productPayload = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory || "",
                moq: parseInt(formData.moq) || 1,
                price: parseFloat(formData.price),
                description: formData.description || "",
                images: formData.images,
                specifications: [
                    ...formData.specifications.filter(spec => spec.name && spec.value),
                    ...(formData.color ? [{ name: "Color", value: formData.color }] : []),
                    ...(formData.pattern ? [{ name: "Pattern", value: formData.pattern }] : []),
                    ...(formData.fabric ? [{ name: "Fabric", value: formData.fabric }] : [])
                ],
                bulkPricing: formData.bulkPricing.filter(tier => tier.minQty && tier.price),
                brand: formData.brand || "",
                availability: formData.availability || "In Stock",
                unit: formData.unit || "Pcs",
            };

            if (isEdit && productId) {
                // Update existing product
                await api.put(`/b2b-vendor/products/${productId}`, productPayload);
                toast.success("Listing updated successfully");
            } else {
                // Create new product
                await api.post('/b2b-vendor/products', productPayload);
                toast.success("Product listed successfully");
            }

            navigate("/b2b-vendor/products/manage-products");
        } catch (error) {
            console.error('Error saving product:', error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save product";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Section: Details (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Basic Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                <FiTag />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Product Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                    placeholder="e.g. Industrial Grade Steel Pipes"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Brand / Manufacturer</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                    placeholder="e.g. Tata Steel"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Availability Status</label>
                                <select
                                    name="availability"
                                    value={formData.availability}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                    <option value="Available on Order">Available on Order</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Color</label>
                                <select
                                    name="color"
                                    value={formData.color || ""}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                >
                                    <option value="">Select Color</option>
                                    {["Red", "Blue", "Green", "Black", "White", "Yellow", "Orange", "Purple", "Pink", "Brown", "Grey", "Multicolor"].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pattern</label>
                                <select
                                    name="pattern"
                                    value={formData.pattern || ""}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                >
                                    <option value="">Select Pattern</option>
                                    {["Solid", "Striped", "Checked", "Floral", "Abstract", "Geometric", "Polka Dot", "Paisley", "Embroidered", "Printed"].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Fabric</label>
                                <select
                                    name="fabric"
                                    value={formData.fabric || ""}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                >
                                    <option value="">Select Fabric</option>
                                    {["Cotton", "Silk", "Wool", "Polyester", "Linen", "Leather", "Denim", "Velvet", "Chiffon", "Georgette", "Rayon", "Nylon", "Satin"].map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    disabled={categoriesLoading}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all disabled:opacity-50"
                                >
                                    <option value="">{categoriesLoading ? "Loading categories..." : "Select Category"}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Subcategory</label>
                                <select
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    disabled={!formData.category || subcategories.length === 0}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all disabled:opacity-50"
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
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <FiList />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Product Description</h3>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={6}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all resize-none shadow-inner"
                            placeholder="Provide a detailed description of the product, its usage, and benefits for B2B buyers..."
                        />
                    </div>

                    {/* Specifications */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                    <FiInfo />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Technical Specifications</h3>
                            </div>
                            <button
                                type="button"
                                onClick={addSpec}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-all"
                            >
                                <FiPlus /> Add Field
                            </button>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence>
                                {formData.specifications.map((spec, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        key={index}
                                        className="flex gap-4 group"
                                    >
                                        <div className="flex-1 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-transparent group-hover:border-orange-100 group-hover:bg-white transition-all">
                                            <input
                                                type="text"
                                                value={spec.name}
                                                onChange={(e) => updateSpec(index, 'name', e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                                                placeholder="Attribute (e.g. Material)"
                                            />
                                            <input
                                                type="text"
                                                value={spec.value}
                                                onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                                                placeholder="Value (e.g. 100% Pure Silk)"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSpec(index)}
                                            className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {formData.specifications.length === 0 && (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-[2rem]">
                                    No specifications added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section: Pricing & Images (4 cols) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Media Gallery */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                    <FiImage />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">Product Gallery</h3>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {formData.images.length}/5
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {formData.images.map((img, index) => (
                                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary-600 text-[8px] text-white font-bold uppercase rounded-md">
                                            Cover
                                        </div>
                                    )}
                                </div>
                            ))}
                            {formData.images.length < 5 && (
                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-200 rounded-2xl hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-all group">
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-purple-600 transition-all">
                                        {isUploading ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> : <FiPlus />}
                                    </div>
                                    <input type="file" onChange={handleMultipleImageUpload} className="hidden" multiple accept="image/*" disabled={isUploading} />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            First image will be used as the main display. Recommend resolution: 800x800px.
                        </p>
                    </div>

                    {/* Pricing */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                <FiDollarSign />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">B2B Pricing</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Base Unit Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                        placeholder="4500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Min. Order Qty (MOQ) <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        name="moq"
                                        value={formData.moq}
                                        onChange={handleChange}
                                        required
                                        className="flex-1 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all"
                                        placeholder="100"
                                    />
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="w-40 px-3 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl transition-all font-bold text-gray-700"
                                    >
                                        <option value="">Select Unit</option>
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
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-bold text-gray-700">Quantity Discounts</label>
                                    <button
                                        type="button"
                                        onClick={addBulkTier}
                                        className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"
                                    >
                                        <FiPlus /> Add Tier
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.bulkPricing.map((tier, index) => (
                                        <div key={index} className="flex items-center gap-2 group">
                                            <div className="flex-1 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl group-hover:bg-green-50/50 transition-all">
                                                <div className="flex items-center gap-1 px-2">
                                                    <span className="text-[10px] text-gray-400 font-bold">MIN</span>
                                                    <input
                                                        type="number"
                                                        value={tier.minQty}
                                                        onChange={(e) => updateBulkTier(index, 'minQty', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold"
                                                        placeholder="1000"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 px-2 border-l border-gray-200">
                                                    <span className="text-[10px] text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={tier.price}
                                                        onChange={(e) => updateBulkTier(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold"
                                                        placeholder="4200"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeBulkTier(index)}
                                                className="p-2 text-red-400 hover:text-red-500"
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

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-6 z-40 flex justify-end gap-3 shadow-2xl">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-8 py-3.5 bg-white border-2 border-gray-100 text-gray-600 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                >
                    Discard Changes
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-3.5 bg-primary-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 disabled:opacity-50 flex items-center gap-3 active:scale-95"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Synchronizing...
                        </>
                    ) : (
                        <>
                            <FiSave size={18} />
                            {isEdit ? 'Update Listing' : 'Publish Product'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default B2BVendorProductForm;
