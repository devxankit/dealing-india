import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const WholesalerProductForm = ({ initialData, isEdit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState(initialData || {
        name: "",
        category: "",
        basePrice: "",
        moq: "",
        description: "",
        image: "",
        images: [],
        specifications: [{ name: "", value: "" }],
        bulkPricing: [{ minQty: "", price: "" }],
    });

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

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(isEdit ? "Listing updated" : "Product listed successfully");
            navigate("/wholesaler/products/manage-products");
        } catch (error) {
            toast.error("Failed to save product");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info & Images */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Product Title</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" placeholder="e.g. Premium Cotton T-Shirts" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500">
                                        <option value="">Select Category</option>
                                        <option value="Clothing">Clothing</option>
                                        <option value="Electronics">Electronics</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Minimum Order Qty (MOQ)</label>
                                    <input type="number" name="moq" value={formData.moq} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" placeholder="100" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" placeholder="Detailed product description..." />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Product Specifications</h3>
                        <div className="space-y-3">
                            {formData.specifications.map((spec, index) => (
                                <div key={index} className="flex gap-3">
                                    <input type="text" value={spec.name} onChange={(e) => updateSpec(index, 'name', e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Attribute (e.g. Material)" />
                                    <input type="text" value={spec.value} onChange={(e) => updateSpec(index, 'value', e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Value (e.g. 100% Cotton)" />
                                    <button type="button" onClick={() => removeSpec(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addSpec} className="flex items-center gap-2 text-sm text-primary-600 font-bold hover:underline">
                                <FiPlus /> Add Specification
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Pricing & Upload */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Pricing Strategy</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Base Per Unit Price (₹)</label>
                                <input type="number" name="basePrice" value={formData.basePrice} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500" placeholder="500" />
                            </div>
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bulk Pricing Tiers</label>
                                {formData.bulkPricing.map((tier, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-gray-400">Min {'>'}</span>
                                        <input type="number" value={tier.minQty} onChange={(e) => updateBulkTier(index, 'minQty', e.target.value)} className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Qty" />
                                        <span className="text-xs text-gray-400">Price: ₹</span>
                                        <input type="number" value={tier.price} onChange={(e) => updateBulkTier(index, 'price', e.target.value)} className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Price" />
                                        <button type="button" onClick={() => removeBulkTier(index)} className="text-red-400">
                                            <FiTrash2 className="text-sm" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addBulkTier} className="mt-2 text-xs text-primary-600 font-bold hover:underline">
                                    + Add Tier
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Product Featured Image</h3>
                        <div className="space-y-4">
                            {formData.image ? (
                                <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100">
                                    <img src={formData.image} alt="Product" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: "" }))} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full">
                                        <FiTrash2 />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                                    <FiUpload className="text-3xl text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-600">Upload Image</span>
                                    <input type="file" onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                    {loading ? 'Saving...' : <><FiSave /> {isEdit ? 'Update Listing' : 'List Product'}</>}
                </button>
            </div>
        </form>
    );
};

export default WholesalerProductForm;
