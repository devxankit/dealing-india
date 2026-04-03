import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiImage, FiInfo, FiTag, FiDollarSign, FiList } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";
import { useSubscriptionStore } from "../store/subscriptionStore";
import imageCompression from 'browser-image-compression';

// Basic in-memory cache for B2B categories during the session
let categoriesCache = null;
let isFetchingCategories = false;
let categoriesPromise = null;

const B2BVendorProductForm = ({ initialData, isEdit, productId }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { vendor } = useB2BVendorAuthStore();

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
    });

    const [categories, setCategories] = useState(categoriesCache || []);
    const [subcategories, setSubcategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(!categoriesCache);
    const [dynamicFields, setDynamicFields] = useState([]);
    const [dynamicValues, setDynamicValues] = useState({});
    const [customMultiInputs, setCustomMultiInputs] = useState({});

    useEffect(() => {
        if (!categoriesCache) {
            fetchCategories();
        } else {
            setCategoriesLoading(false);
        }
    }, []);

    const fetchCategories = async () => {
        if (categoriesCache) {
            setCategories(categoriesCache);
            setCategoriesLoading(false);
            return;
        }

        if (isFetchingCategories && categoriesPromise) {
            try {
                const cached = await categoriesPromise;
                if (cached) {
                    setCategories(cached);
                }
            } catch (err) {
                // Ignore, handled by primary fetcher
            } finally {
                setCategoriesLoading(false);
            }
            return;
        }

        setCategoriesLoading(true);
        isFetchingCategories = true;

        categoriesPromise = (async () => {
            try {
                const response = await api.get('/public/b2b-categories');
                if (response.success && response.data) {
                    // Transform backend format to frontend format
                    const transformedCategories = response.data.map((cat, index) => ({
                        id: cat._id || cat.id || index.toString(),
                        name: cat.name,
                        subcategories: cat.subcategories || [], // [{ name, fields }]
                    }));
                    categoriesCache = transformedCategories;
                    return transformedCategories;
                }
                return [];
            } catch (error) {
                console.error('Error fetching B2B categories:', error);
                toast.error('Failed to load categories');
                return [];
            } finally {
                isFetchingCategories = false;
                categoriesPromise = null;
            }
        })();

        const result = await categoriesPromise;
        setCategories(result);
        setCategoriesLoading(false);
    };

    useEffect(() => {
        if (categories.length > 0 && formData.category) {
            // Case-insensitive match for category
            const selectedCategory = categories.find(cat =>
                cat.name.toLowerCase() === formData.category.toLowerCase()
            );

            if (selectedCategory) {
                // If casing is different, update formData to match the list's casing
                if (selectedCategory.name !== formData.category) {
                    setFormData(prev => ({ ...prev, category: selectedCategory.name }));
                }
                setSubcategories(selectedCategory.subcategories || []);
            } else {
                setSubcategories([]);
            }
        }
    }, [formData.category, categories]);

    useEffect(() => {
        if (categories.length > 0 && formData.category && formData.subcategory) {
            const cat = categories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
            const sub = cat?.subcategories.find(s => s.name.toLowerCase() === formData.subcategory.toLowerCase());

            // If casing differs for subcategory, update it
            if (sub && sub.name !== formData.subcategory) {
                setFormData(prev => ({ ...prev, subcategory: sub.name }));
            }

            const fields = sub?.fields || [];
            setDynamicFields(fields);

            // Populate dynamicValues from formData.specifications (including custom values for select/multi-select)
            setDynamicValues(prev => {
                const newValues = { ...prev };
                const opts = (o) => (Array.isArray(o) ? o : (o ? [o] : [])).map(String);

                fields.forEach(field => {
                    const existingSpec = formData.specifications.find(
                        s => s.name?.toLowerCase() === field.label?.toLowerCase()
                    );
                    if (!existingSpec || (existingSpec.value !== 0 && !existingSpec.value)) return;

                    const fieldOpts = opts(field.options);
                    const val = existingSpec.value;

                    if (field.type === 'select') {
                        const strVal = typeof val === 'string' ? val : (Array.isArray(val) ? val[0] : String(val));
                        const isInOptions = fieldOpts.some(opt => String(opt).toLowerCase() === String(strVal).toLowerCase());
                        if (isInOptions) {
                            if (!newValues[field.label]) newValues[field.label] = strVal;
                        } else {
                            newValues[field.label] = '__OTHER__';
                            newValues[`${field.label}_custom`] = strVal || '';
                        }
                    } else if (field.type === 'multi-select') {
                        const arrVal = Array.isArray(val) ? val : [val];
                        if (!newValues[field.label]) newValues[field.label] = arrVal.map(v => (v != null ? String(v) : ''));
                    } else if (!newValues[field.label]) {
                        newValues[field.label] = val;
                    }
                });
                return newValues;
            });
        } else {
            setDynamicFields([]);
            setDynamicValues({});
            setCustomMultiInputs({});
        }
    }, [formData.category, formData.subcategory, categories]);

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

    // Helper to update spec by name (for dynamic fields)
    const updateSpecByName = (name, value) => {
        setFormData(prev => {
            const specs = [...prev.specifications];
            const index = specs.findIndex(s => s.name === name);
            if (index > -1) {
                specs[index].value = value;
            } else {
                specs.push({ name, value });
            }
            return { ...prev, specifications: specs };
        });
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

    const { canCreateProduct } = useSubscriptionStore();
    const productPermission = canCreateProduct();
    const MAX_PHOTOS = productPermission.maxImages !== undefined ? parseInt(productPermission.maxImages) : 5;

    const handleMultipleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Handle case where limit is -1 (unlimited) or high
        if (MAX_PHOTOS !== -1 && formData.images.length + files.length > MAX_PHOTOS) {
            toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Compressing images...');

        try {
            const validFiles = [];

            for (const file of files) {
                // Size check is less relevant now as we compress, but good to keep basic check or rely on compression
                if (file.type.startsWith('image/')) {
                    validFiles.push(file);
                }
            }

            if (validFiles.length === 0) {
                setIsUploading(false);
                toast.dismiss(toastId);
                return;
            }

            const compressedFiles = await Promise.all(
                validFiles.map(async (file) => {
                    try {
                        const options = {
                            maxSizeMB: 0.1, // Max size 0.1MB (100KB)
                            maxWidthOrHeight: 800,
                            useWebWorker: true,
                        };
                        return await imageCompression(file, options);
                    } catch (error) {
                        console.error('Compression ended with error:', error);
                        return file; // Fallback
                    }
                })
            );

            const newImages = await Promise.all(
                compressedFiles.map(file => {
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

            toast.success(`${validFiles.length} images added`, { id: toastId });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error("Failed to upload some images", { id: toastId });
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
            // Prepare specifications including dynamic fields (admin options + manual/custom values)
            const dynamicSpecs = dynamicFields.map(f => {
                const key = f.label;
                let value = dynamicValues[key];
                if (f.type === 'select') {
                    if (value === '__OTHER__') {
                        value = dynamicValues[`${key}_custom`] || '';
                    }
                }
                
                // 🔹 Fix: Handle multi-select arrays for string-type backend
                if (Array.isArray(value)) {
                    value = value.join(', ');
                }

                // Skip internal keys and empty values
                if (key.endsWith('_custom') || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
                return { name: key, value: String(value) };
            }).filter(Boolean);

            // Filter out any dynamic fields that might already exist in specifications to avoid duplicates
            const genericSpecs = formData.specifications.filter(spec =>
                spec.name && spec.value &&
                !dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase())
            );

            const finalSpecs = [
                ...genericSpecs,
                ...dynamicSpecs,
            ].map(spec => ({
                ...spec,
                value: Array.isArray(spec.value) ? spec.value.join(', ') : String(spec.value || '')
            }));

            // Prepare data for API
            const productPayload = {
                name: formData.name,
                category: formData.category,
                subcategory: formData.subcategory || "",
                moq: parseInt(formData.moq) || 1,
                price: parseFloat(formData.price),
                description: formData.description || "",
                images: formData.images,
                specifications: finalSpecs,
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

            categoriesCache = null;
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
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Section: Details (8 cols) */}
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
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Product Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                    placeholder="e.g. Industrial Grade Steel Pipes"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Category <span className="text-red-500">*</span></label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({ 
                                            ...prev, 
                                            category: val,
                                            // Reset subcategory if category changes
                                            subcategory: val === '__OTHER_CAT__' ? '' : prev.subcategory 
                                        }));
                                    }}
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
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({ ...prev, subcategory: val }));
                                    }}
                                    disabled={!formData.category || (formData.category !== '__OTHER_CAT__' && subcategories.length === 0)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none disabled:opacity-50"
                                >
                                    <option value="">Select Subcategory</option>
                                    {subcategories.map((sub, index) => (
                                        <option key={index} value={sub.name}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dynamic Fields Rendering Section */}
                            {dynamicFields.map((f, i) => (
                                <div key={i} className="mb-4">
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">
                                        {f.label} {f.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {f.type === "text" && (
                                        <input
                                            type="text"
                                            value={dynamicValues[f.label] || ""}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                            placeholder={`Enter ${f.label}`}
                                            onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                        />
                                    )}

                                    {f.type === "number" && (
                                        <input
                                            type="number"
                                            value={dynamicValues[f.label] || ""}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                            placeholder="0"
                                            onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                        />
                                    )}

                                    {f.type === "select" && (
                                        <div className="space-y-2">
                                            <select
                                                value={dynamicValues[f.label] || ""}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                                onChange={(e) => setDynamicValues(p => ({ ...p, [f.label]: e.target.value }))}
                                            >
                                                <option value="">Select {f.label}</option>
                                                {(f.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                <option value="__OTHER__">ADD</option>
                                            </select>
                                            {(dynamicValues[f.label] === '__OTHER__') && (
                                                <input
                                                    type="text"
                                                    value={dynamicValues[`${f.label}_custom`] || ""}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                                    placeholder={`Enter ${f.label} manually`}
                                                    onChange={(e) => setDynamicValues(p => ({ ...p, [`${f.label}_custom`]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {f.type === "multi-select" && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                                                {(f.options || []).map(opt => {
                                                    const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                    const isSelected = currentVals.some(v => String(v).toLowerCase() === String(opt).toLowerCase());

                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${isSelected
                                                                ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                                                                : 'bg-white border-transparent hover:border-gray-300 text-gray-600'
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'
                                                                }`}>
                                                                {isSelected && <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 mb-0.5"></div>}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const newVals = e.target.checked
                                                                        ? [...currentVals, opt]
                                                                        : currentVals.filter(v => String(v).toLowerCase() !== String(opt).toLowerCase());
                                                                    setDynamicValues(p => ({ ...p, [f.label]: newVals }));
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold select-none whitespace-normal break-words">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                                {(f.options || []).length === 0 && (
                                                    <div className="col-span-full text-center py-4 text-gray-400 text-xs italic">
                                                        No options available
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={customMultiInputs[f.label] ?? ''}
                                                    className="flex-1 min-w-[120px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:border-primary-500 outline-none"
                                                    placeholder="Add custom value (not in list)"
                                                    onChange={(e) => setCustomMultiInputs(p => ({ ...p, [f.label]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const v = (customMultiInputs[f.label] ?? '').trim();
                                                            if (!v) return;
                                                            const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                            if (currentVals.some(c => String(c).toLowerCase() === v.toLowerCase())) return;
                                                            setDynamicValues(p => ({ ...p, [f.label]: [...currentVals, v] }));
                                                            setCustomMultiInputs(p => ({ ...p, [f.label]: '' }));
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const v = (customMultiInputs[f.label] ?? '').trim();
                                                        if (!v) return;
                                                        const currentVals = Array.isArray(dynamicValues[f.label]) ? dynamicValues[f.label] : [];
                                                        if (currentVals.some(c => String(c).toLowerCase() === v.toLowerCase())) return;
                                                        setDynamicValues(p => ({ ...p, [f.label]: [...currentVals, v] }));
                                                        setCustomMultiInputs(p => ({ ...p, [f.label]: '' }));
                                                    }}
                                                    className="px-3 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            {Array.isArray(dynamicValues[f.label]) && dynamicValues[f.label].filter(v => !(f.options || []).some(o => String(o).toLowerCase() === String(v).toLowerCase())).length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {dynamicValues[f.label].filter(v => !(f.options || []).some(o => String(o).toLowerCase() === String(v).toLowerCase())).map((customVal, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold">
                                                            {customVal}
                                                            <button type="button" onClick={() => {
                                                                const currentVals = [...(dynamicValues[f.label] || [])];
                                                                const next = currentVals.filter(c => c !== customVal);
                                                                setDynamicValues(p => ({ ...p, [f.label]: next }));
                                                            }} className="text-gray-400 hover:text-red-600 ml-0.5">&times;</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

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


                        </div>
                    </motion.div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                                <FiList />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Product Description</h3>
                        </div>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all resize-none outline-none"
                            placeholder="Provide a detailed description of the product, its usage, and benefits for B2B buyers..."
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
                                {formData.specifications.map((spec, index) => {
                                    // Hide specs that are already shown as dynamic fields
                                    if (dynamicFields.some(df => df.label?.toLowerCase() === spec.name?.toLowerCase())) {
                                        return null;
                                    }

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            key={index}
                                            className="flex gap-3 group"
                                        >
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 focus-within:border-orange-200 focus-within:bg-white transition-all">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Attribute</label>
                                                    <input
                                                        type="text"
                                                        value={spec.name}
                                                        onChange={(e) => updateSpec(index, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-700 outline-none p-0"
                                                        placeholder="Material"
                                                    />
                                                </div>
                                                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-gray-100 focus-within:border-orange-200 focus-within:bg-white transition-all">
                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Value</label>
                                                    <input
                                                        type="text"
                                                        value={spec.value}
                                                        onChange={(e) => updateSpec(index, 'value', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-600 outline-none p-0"
                                                        placeholder="100% Cotton"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeSpec(index)}
                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {formData.specifications.length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm">
                                    No specifications added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section: Pricing & Images (4 cols) */}
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
                            {MAX_PHOTOS === 0 ? "No photos allowed on this plan." : `First image is cover. Max ${MAX_PHOTOS < 0 ? 'unlimited' : MAX_PHOTOS} photos.`} Max 300KB each.
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
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Base Price <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</div>
                                    <input
                                        type="number"
                                        step="any"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none"
                                        placeholder="4500.50"
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
                                        placeholder="100"
                                    />
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="w-28 px-2 py-2.5 bg-slate-50 border border-gray-200 focus:border-primary-500 focus:bg-white rounded-xl transition-all outline-none font-bold text-gray-700 text-xs"
                                    >
                                        <option value="">Unit</option>
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
                                        <option value="Night">Night</option>
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
                                                        placeholder="1000"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1 px-1 border-l border-gray-200">
                                                    <span className="text-[8px] text-gray-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={tier.price}
                                                        onChange={(e) => updateBulkTier(index, 'price', e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold outline-none"
                                                        placeholder="4200.00"
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
                            {isEdit ? 'Update listing' : 'Publish Product'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default B2BVendorProductForm;
