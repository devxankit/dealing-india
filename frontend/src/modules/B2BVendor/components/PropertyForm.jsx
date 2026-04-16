import { useState, useEffect } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "../../../shared/utils/toast";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";
import { useSubscriptionStore } from "../store/subscriptionStore";

const DRAFT_KEY = "b2b_property_add_draft";

const PropertyForm = ({ initialData, isEdit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);
    const [media, setMedia] = useState(() => {
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).media || []; } catch(e) {}
            }
        }
        return [];
    }); // { url, data, name }

    const propertyTypeOptions = ["Shop/Showroom", "Office Space", "Warehouse", "Industrial Shed", "Penthouse", "Flat", "Villa", "Plot"];

    const [formData, setFormData] = useState(() => {
        const defaultData = {
            title: '', propertyTypes: [], listingType: 'Rent', description: '',
            saleDetails: { priceMin: '', priceMax: '', priceUnit: 'Lakh', depositAmount: '', depositUnit: 'Lakh', maintenance: 'Excluded', veraBill: 'Excluded' },
            rentDetails: { monthlyRent: '', rentUnit: 'Thousand', depositAmount: '', depositUnit: 'Thousand', maintenance: 'Excluded', veraBill: 'Excluded' },
            leaseDetails: { monthlyLeaseRate: '', leaseUnit: 'Lakh', depositAmount: '', depositUnit: 'Lakh', leaseDurationYears: '' },
            status: { furnishing: 'Unfurnished', propertyStatus: 'Ready', propertyCondition: 'New', propertyPosition: 'Ready to Move' },
            location: { address: '', area: '', market: '', city: '', mapUrl: '' },
            roadFacing: 'Main Road', legal: { loanAvailable: 'No', reraApproved: 'No', load: '' },
            specifications: [{ builtUpArea: '', builtUpAreaUnit: 'Sq. Ft.', carpetArea: '', carpetAreaUnit: '%', floorNumber: '', totalFloors: '', ceilingHeight: '', ceilingHeightUnit: 'Ft.', entranceWidth: '', entranceWidthUnit: 'Ft.', maliya: 'No' }],
            facilities: { parking: [], lift: 'No', liftPassenger: 'No', liftLoading: 'No', powerBackup: 'No', waterSupply: [], washroom: ['Common'], fireSafety: 'No' }
        };

        if (initialData) return defaultData; // Will be hydrated by useEffect below
        if (!isEdit) {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                try { return JSON.parse(saved).formData || defaultData; } catch(e) {}
            }
        }
        return defaultData;
    });

    // Auto-save draft
    useEffect(() => {
        if (!isEdit) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, media }));
        } else {
            localStorage.removeItem(DRAFT_KEY);
        }
    }, [formData, media, isEdit]);

    useEffect(() => {
        if (initialData) {
            let specs = [];

            // Handle legacy specifications (object) vs new (array)
            if (Array.isArray(initialData.specifications)) {
                specs = initialData.specifications.map(spec => ({
                    ...spec,
                    maliya: (typeof spec.maliya === 'string') ? spec.maliya : (Array.isArray(spec.maliya) && spec.maliya[0]?.value) || 'No'
                }));
            } else if (initialData.specifications && typeof initialData.specifications === 'object') {
                const maliyaVal = (Array.isArray(initialData.specifications.maliya) && initialData.specifications.maliya[0]?.value) || 'No';
                specs = [{
                    ...initialData.specifications,
                    maliya: maliyaVal
                }];
            } else {
                specs = [{
                    builtUpArea: '', builtUpAreaUnit: 'Sq. Ft.',
                    carpetArea: '', carpetAreaUnit: '%',
                    floorNumber: '', totalFloors: '',
                    ceilingHeight: '', ceilingHeightUnit: 'Ft.',
                    entranceWidth: '', entranceWidthUnit: 'Ft.',
                    maliya: 'No'
                }];
            }

            setFormData(prev => ({
                ...prev,
                ...initialData,
                saleDetails: { ...prev.saleDetails, ...(initialData.saleDetails || {}) },
                rentDetails: { ...prev.rentDetails, ...(initialData.rentDetails || {}) },
                leaseDetails: { ...prev.leaseDetails, ...(initialData.leaseDetails || {}) },
                status: { ...prev.status, ...(initialData.status || {}) },
                location: { ...prev.location, ...(initialData.location || {}) },
                legal: { ...prev.legal, ...(initialData.legal || {}) },
                specifications: specs,
                facilities: { ...prev.facilities, ...(initialData.facilities || {}) },
                propertyTypes: initialData.propertyTypes || (initialData.propertyType ? [initialData.propertyType] : []),
            }));

            if (initialData.media && Array.isArray(initialData.media)) {
                setMedia(initialData.media.map(m => ({ url: m.url, data: m.url })));
            }
        }
    }, [initialData]);

    const handleChange = (e, index = null) => {
        const { name, value } = e.target;

        if (index !== null && name.startsWith('specifications')) {
            const field = name.split('.')[1];
            setFormData(prev => {
                const newSpecs = [...prev.specifications];
                if (newSpecs[index]) {
                    newSpecs[index] = { ...newSpecs[index], [field]: value };
                }
                return { ...prev, specifications: newSpecs };
            });
        } else if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePropertyTypeChange = (type) => {
        setFormData(prev => {
            const types = prev.propertyTypes.includes(type)
                ? prev.propertyTypes.filter(t => t !== type)
                : [...prev.propertyTypes, type];
            return { ...prev, propertyTypes: types };
        });
    };

    const addSpecification = () => {
        setFormData(prev => ({
            ...prev,
            specifications: [
                ...prev.specifications,
                {
                    builtUpArea: '', builtUpAreaUnit: 'Sq. Ft.',
                    carpetArea: '', carpetAreaUnit: '%',
                    floorNumber: '', totalFloors: '',
                    ceilingHeight: '', ceilingHeightUnit: 'Ft.',
                    entranceWidth: '', entranceWidthUnit: 'Ft.',
                    maliya: 'No'
                }
            ]
        }));
    };

    const removeSpecification = (index) => {
        if (formData.specifications.length <= 1) {
            toast.error("At least one specification section is required.");
            return;
        }
        setFormData(prev => ({
            ...prev,
            specifications: prev.specifications.filter((_, i) => i !== index)
        }));
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);

        if (media.length + files.length > 100) {
            toast.error('Maximum 100 images allowed per property');
            return;
        }

        const toastId = toast.loading('Processing images...');
        try {
            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
            const results = await Promise.all(
                files.map(async (file) => {
                    try {
                        const compressed = await imageCompression(file, options);
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.readAsDataURL(compressed);
                        });
                    } catch (err) {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                            reader.readAsDataURL(file);
                        });
                    }
                })
            );

            setMedia(prev => [...prev, ...results]);
            toast.success(`${files.length} images added`, { id: toastId });
        } catch (error) {
            toast.error('Failed to process images', { id: toastId });
        }
    };

    const removeImage = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.title?.trim()) newErrors.title = "Listing title is required";
            if (!formData.propertyTypes?.length) newErrors.propertyTypes = "At least one property type is required";
        }
        if (currentStep === 4) {
            if (!formData.location?.address?.trim()) newErrors['location.address'] = "Address is required";
            if (!formData.location?.area?.trim()) newErrors['location.area'] = "Locality/Area is required";
            if (!formData.location?.city?.trim()) newErrors['location.city'] = "City is required";
        }
        if (currentStep === 5) {
            if (media.length === 0) newErrors.media = "At least one photo is required";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstError = Object.keys(newErrors)[0];
            const el = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep(step)) return;

        const parseNumber = (val) => {
            if (!val) return null;
            const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? null : parsed;
        };

        try {
            setLoading(true);

            const payload = {
                ...formData,
                propertyType: formData.propertyTypes[0] || "",
                specifications: formData.specifications.map(spec => ({
                    ...spec,
                    builtUpArea: parseNumber(spec.builtUpArea),
                    carpetArea: parseNumber(spec.carpetArea),
                    floorNumber: parseNumber(spec.floorNumber),
                    totalFloors: parseNumber(spec.totalFloors),
                    ceilingHeight: parseNumber(spec.ceilingHeight),
                    entranceWidth: parseNumber(spec.entranceWidth)
                })),
                media: media.map(m => ({ url: m.data || m.url }))
            };

            const response = isEdit
                ? await api.put(`/property/update/${initialData._id}`, payload)
                : await api.post('/property/add', payload);

            if (response.success) {
                localStorage.removeItem(DRAFT_KEY);
                toast.success(isEdit ? 'Property updated successfully!' : 'Property listed successfully!');
                // Refresh subscription status to update counts
                try {
                    await useSubscriptionStore.getState().refreshStatus();
                } catch (e) {
                    console.error("Refresh status failed", e);
                }
                navigate('/b2b-vendor/properties/manage-properties');
            }
        } catch (error) {
            toast.error(error.message || (isEdit ? 'Failed to update property' : 'Failed to list property'));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: "Basic", sub: "Step 1" },
        { id: 2, title: "Pricing", sub: "Step 2" },
        { id: 3, title: "Specs", sub: "Step 3" },
        { id: 4, title: "Location", sub: "Step 4" },
        { id: 5, title: "Media", sub: "Step 5" },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{isEdit ? 'Edit' : 'Add'} Commercial Property</h1>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Growth your business with Dealing India</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-50 mb-8 overflow-x-auto gap-4">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all ${step >= s.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {step > s.id ? <FiCheck /> : s.id}
                            </div>
                            <div className="hidden md:block text-[10px] font-black uppercase whitespace-nowrap">{s.title}</div>
                        </div>
                        {idx < steps.length - 1 && <div className={`h-[2px] flex-1 mx-2 transition-all min-w-[12px] ${step > s.id ? 'bg-primary-600' : 'bg-slate-100'}`} />}
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-50 flex-1 flex flex-col mb-10">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Title <span className="text-red-500">*</span></label>
                                <input name="title" type="text" value={formData.title} onChange={handleChange} className={`w-full px-6 py-4 bg-slate-50 border-2 ${errors.title ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-slate-300'} rounded-2xl outline-none transition-all font-bold text-slate-700`} placeholder="Prime Commercial Hub in Heart of City" />
                                {errors.title && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.title}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Property Type (Select Multiple) <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {propertyTypeOptions.map(t => (
                                        <label key={t} className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm ${formData.propertyTypes.includes(t) ? 'border-primary-600 bg-primary-600 text-white' : errors.propertyTypes ? 'border-red-200 bg-red-50 text-red-400' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                                            <input type="checkbox" checked={formData.propertyTypes.includes(t)} onChange={() => { if (errors.propertyTypes) setErrors(p => ({ ...p, propertyTypes: null })); handlePropertyTypeChange(t); }} className="hidden" />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                                {errors.propertyTypes && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1">{errors.propertyTypes}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Type <span className="text-red-500">*</span></label>
                                    <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        {['Sale', 'Rent', 'Lease'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[46px]" placeholder="Brief description..." />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            {formData.listingType === 'Sale' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Sale Details</div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <input type="number" name="saleDetails.priceMin" placeholder="Min Price" value={formData.saleDetails.priceMin} onChange={handleChange} className="input-field" />
                                        <input type="number" name="saleDetails.priceMax" placeholder="Max Price" value={formData.saleDetails.priceMax} onChange={handleChange} className="input-field" />
                                        <select name="saleDetails.priceUnit" value={formData.saleDetails.priceUnit} onChange={handleChange} className="input-select bg-primary-50 text-primary-700 font-bold">
                                            <option value="Rs">Rs</option>
                                            <option value="Thousand">Thousand</option>
                                            <option value="Lakh">Lakh</option>
                                            <option value="Crore">Crore</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {formData.listingType === 'Rent' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Rent Details</div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="number" name="rentDetails.monthlyRent" placeholder="Monthly Rent" value={formData.rentDetails.monthlyRent} onChange={handleChange} className="input-field" />
                                        <select name="rentDetails.rentUnit" value={formData.rentDetails.rentUnit} onChange={handleChange} className="input-select bg-primary-50 text-primary-700 font-bold">
                                            <option value="Rs">Rs</option>
                                            <option value="Thousand">Thousand</option>
                                            <option value="Lakh">Lakh</option>
                                            <option value="Crore">Crore</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="number" name="rentDetails.depositAmount" placeholder="Deposit Amount" value={formData.rentDetails.depositAmount} onChange={handleChange} className="input-field" />
                                        <select name="rentDetails.depositUnit" value={formData.rentDetails.depositUnit} onChange={handleChange} className="input-select bg-primary-50 text-primary-700 font-bold">
                                            <option value="Rs">Rs</option>
                                            <option value="Thousand">Thousand</option>
                                            <option value="Lakh">Lakh</option>
                                            <option value="Crore">Crore</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label">Maintenance</label>
                                        <select name="rentDetails.maintenance" value={formData.rentDetails.maintenance} onChange={handleChange} className="input-select">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Vera Bill</label>
                                        <select name="rentDetails.veraBill" value={formData.rentDetails.veraBill} onChange={handleChange} className="input-select">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {formData.listingType === 'Lease' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Lease Details</div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="number" name="leaseDetails.monthlyLeaseRate" placeholder="Monthly Lease Rate" value={formData.leaseDetails.monthlyLeaseRate} onChange={handleChange} className="input-field" />
                                        <select name="leaseDetails.leaseUnit" value={formData.leaseDetails.leaseUnit} onChange={handleChange} className="input-select bg-primary-50 text-primary-700 font-bold">
                                            <option value="Rs">Rs</option>
                                            <option value="Thousand">Thousand</option>
                                            <option value="Lakh">Lakh</option>
                                            <option value="Crore">Crore</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input type="number" name="leaseDetails.depositAmount" placeholder="Deposit Amount" value={formData.leaseDetails.depositAmount} onChange={handleChange} className="input-field" />
                                        <select name="leaseDetails.depositUnit" value={formData.leaseDetails.depositUnit} onChange={handleChange} className="input-select bg-primary-50 text-primary-700 font-bold">
                                            <option value="Rs">Rs</option>
                                            <option value="Thousand">Thousand</option>
                                            <option value="Lakh">Lakh</option>
                                            <option value="Crore">Crore</option>
                                        </select>
                                    </div>
                                    <input type="number" name="leaseDetails.leaseDurationYears" placeholder="Duration (Years)" value={formData.leaseDetails.leaseDurationYears} onChange={handleChange} className="input-field" />
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 uppercase">Specifications</h3>
                                <button
                                    type="button"
                                    onClick={addSpecification}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all"
                                >
                                    <FiPlus size={16} />
                                    Add Spec
                                </button>
                            </div>

                            <div className="space-y-6">
                                {formData.specifications.map((spec, index) => (
                                    <div key={index} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 relative">
                                        {formData.specifications.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSpecification(index)}
                                                className="absolute top-4 right-4 p-2 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors"
                                                title="Remove Specification"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="label">Built Up Area</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="specifications.builtUpArea"
                                                        placeholder="Area Value"
                                                        value={spec.builtUpArea}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-field flex-[2]"
                                                    />
                                                    <select
                                                        name="specifications.builtUpAreaUnit"
                                                        value={spec.builtUpAreaUnit}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-select flex-1 bg-primary-50 text-primary-700 font-bold"
                                                    >
                                                        {['Sq. Ft.', 'Sq. Mt.', 'Sq. Yd.', 'Acre', 'Gaj'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Common Area (CAP %)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="specifications.carpetArea"
                                                        placeholder="CAP %"
                                                        value={spec.carpetArea}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-field flex-[2]"
                                                    />
                                                    <select
                                                        name="specifications.carpetAreaUnit"
                                                        value={spec.carpetAreaUnit}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-select flex-1 bg-primary-50 text-primary-700 font-bold"
                                                    >
                                                        {['%'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Floor No.</label>
                                                <input
                                                    name="specifications.floorNumber"
                                                    placeholder="Floor No."
                                                    value={spec.floorNumber}
                                                    onChange={(e) => handleChange(e, index)}
                                                    className="input-field"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Total Floors</label>
                                                <input
                                                    name="specifications.totalFloors"
                                                    placeholder="Total Floors"
                                                    value={spec.totalFloors}
                                                    onChange={(e) => handleChange(e, index)}
                                                    className="input-field"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Ceiling Height</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="specifications.ceilingHeight"
                                                        placeholder="Height Value"
                                                        value={spec.ceilingHeight}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-field flex-[2]"
                                                    />
                                                    <select
                                                        name="specifications.ceilingHeightUnit"
                                                        value={spec.ceilingHeightUnit}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-select flex-1 bg-primary-50 text-primary-700 font-bold"
                                                    >
                                                        {['Ft.', 'Mt.'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Entrance Width</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="specifications.entranceWidth"
                                                        placeholder="Width Value"
                                                        value={spec.entranceWidth}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-field flex-[2]"
                                                    />
                                                    <select
                                                        name="specifications.entranceWidthUnit"
                                                        value={spec.entranceWidthUnit}
                                                        onChange={(e) => handleChange(e, index)}
                                                        className="input-select flex-1 bg-primary-50 text-primary-700 font-bold"
                                                    >
                                                        {['Ft.', 'Mt.'].map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="label">Maliya</label>
                                                <select
                                                    name="specifications.maliya"
                                                    value={spec.maliya || 'No'}
                                                    onChange={(e) => handleChange(e, index)}
                                                    className="input-select"
                                                >
                                                    <option value="No">No</option>
                                                    <option value="Yes">Yes</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-xl font-black text-slate-900 uppercase">Facilities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="label">Parking</label>
                                    <div className="flex gap-2">
                                        {['Car', 'Two-Wheeler', 'No'].map(type => (
                                            <label
                                                key={type}
                                                className={`flex-1 py-3 px-2 rounded-xl text-center text-xs font-bold border-2 cursor-pointer transition-all ${formData.facilities.parking.includes(type)
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                                                    }`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.facilities.parking.includes(type)}
                                                    onChange={() => {
                                                        const current = Array.isArray(formData.facilities.parking) ? formData.facilities.parking : [];
                                                        let updated;

                                                        if (type === 'No') {
                                                            updated = ['No'];
                                                        } else {
                                                            const withoutNo = current.filter(t => t !== 'No');
                                                            if (withoutNo.includes(type)) {
                                                                updated = withoutNo.filter(t => t !== type);
                                                            } else {
                                                                updated = [...withoutNo, type];
                                                            }
                                                        }

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            facilities: { ...prev.facilities, parking: updated }
                                                        }));
                                                    }}
                                                    className="hidden"
                                                />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Lift</label>
                                    <select name="facilities.lift" value={formData.facilities.lift} onChange={handleChange} className="input-select">
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                                {/* ... Other lift types ... */}
                                <div>
                                    <label className="label">Power Backup</label>
                                    <select name="facilities.powerBackup" value={formData.facilities.powerBackup} onChange={handleChange} className="input-select">
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label">Water Supply</label>
                                    <div className="flex gap-2">
                                        {['24hr', 'Borewell', 'Municipal', 'No'].map(type => (
                                            <label
                                                key={type}
                                                className={`flex-1 py-3 px-1 rounded-xl text-center text-[10px] font-black border-2 cursor-pointer transition-all ${(Array.isArray(formData.facilities.waterSupply) ? formData.facilities.waterSupply : [formData.facilities.waterSupply]).includes(type)
                                                        ? 'bg-primary-600 text-white border-primary-600'
                                                        : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                                                    }`}>
                                                <input
                                                    type="checkbox"
                                                    checked={(Array.isArray(formData.facilities.waterSupply) ? formData.facilities.waterSupply : [formData.facilities.waterSupply]).includes(type)}
                                                    onChange={() => {
                                                        const current = Array.isArray(formData.facilities.waterSupply) ? formData.facilities.waterSupply : [formData.facilities.waterSupply];
                                                        let updated;

                                                        if (type === 'No') {
                                                            updated = ['No'];
                                                        } else {
                                                            const withoutNo = current.filter(t => t !== 'No');
                                                            if (withoutNo.includes(type)) {
                                                                updated = withoutNo.filter(t => t !== type);
                                                            } else {
                                                                updated = [...withoutNo, type];
                                                            }
                                                            if (updated.length === 0) updated = ['No'];
                                                        }

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            facilities: { ...prev.facilities, waterSupply: updated }
                                                        }));
                                                    }}
                                                    className="hidden"
                                                />
                                                {type}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 uppercase">Status & Legal</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Furnishing</label>
                                    <select name="status.furnishing" value={formData.status.furnishing} onChange={handleChange} className="input-select">
                                        <option value="Fully Furnished">Fully Furnished</option>
                                        <option value="Semi Furnished">Semi Furnished</option>
                                        <option value="Unfurnished">Unfurnished</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Condition</label>
                                    <select name="status.propertyCondition" value={formData.status.propertyCondition} onChange={handleChange} className="input-select">
                                        <option value="New">New</option>
                                        <option value="0-5 years">0-5 years</option>
                                        <option value="5-10 years">5-10 years</option>
                                        <option value="10+ years">10+ years</option>
                                    </select>
                                </div>
                                {formData.listingType === 'Sale' && (
                                    <div>
                                        <label className="label">Loan Available</label>
                                        <select name="legal.loanAvailable" value={formData.legal.loanAvailable} onChange={handleChange} className="input-select">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="label">RERA Approved</label>
                                    <select name="legal.reraApproved" value={formData.legal.reraApproved} onChange={handleChange} className="input-select">
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="label">Full Address <span className="text-red-500">*</span></label>
                                    <textarea name="location.address" value={formData.location.address} onChange={handleChange} className={`input-field min-h-[80px] ${errors['location.address'] ? 'border-red-500 bg-red-50' : ''}`} />
                                    {errors['location.address'] && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors['location.address']}</p>}
                                </div>
                                <div>
                                    <label className="label uppercase text-[8px] text-gray-400 mb-1 ml-1 text-slate-900">Locality/Area <span className="text-red-500">*</span></label>
                                    <input name="location.area" placeholder="E.g. MG Road" value={formData.location.area} onChange={handleChange} className={`input-field ${errors['location.area'] ? 'border-red-500 bg-red-50' : ''}`} />
                                    {errors['location.area'] && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors['location.area']}</p>}
                                </div>
                                <div>
                                    <label className="label uppercase text-[8px] text-gray-400 mb-1 ml-1 text-slate-900">City <span className="text-red-500">*</span></label>
                                    <input name="location.city" placeholder="City" value={formData.location.city} onChange={handleChange} className={`input-field ${errors['location.city'] ? 'border-red-500 bg-red-50' : ''}`} />
                                    {errors['location.city'] && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors['location.city']}</p>}
                                </div>
                                <div>
                                    <label className="label uppercase text-[8px] text-gray-400 mb-1 ml-1">Market</label>
                                    <input name="location.market" placeholder="Market" value={formData.location.market} onChange={handleChange} className="input-field" />
                                </div>
                                <div className="md:col-span-2">
                                    <input name="location.mapUrl" placeholder="Google Map URL" value={formData.location.mapUrl} onChange={handleChange} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Road Facing</label>
                                    <select name="roadFacing" value={formData.roadFacing} onChange={handleChange} className="input-select">
                                        <option value="Main Road">Main Road</option>
                                        <option value="Internal Road">Internal Road</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            <div>
                                <label className="label mb-4">Property Media <span className="text-red-500">*</span></label>
                                <p className="text-[10px] text-primary-600 font-black uppercase tracking-widest mb-3">Note: Please upload square images (1:1 ratio) for better display.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {media.map((img, idx) => (
                                        <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-100">
                                            <img src={img.data || img.url} alt="preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all text-slate-400">
                                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        <FiPlus size={24} />
                                        <span className="text-[10px] font-bold uppercase">Add Photo</span>
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="mt-auto pt-8 border-t border-gray-50 flex justify-between">
                    <button
                        disabled={step === 1}
                        onClick={() => setStep(s => s - 1)}
                        className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                        Back
                    </button>
                    {step < 5 ? (
                        <button
                            onClick={() => {
                                if (validateStep(step)) setStep(s => s + 1);
                            }}
                            className="bg-primary-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-primary-700 shadow-xl shadow-slate-200"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            disabled={loading}
                            onClick={handleSubmit}
                            className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-primary-700 shadow-xl shadow-primary-100 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (isEdit ? 'Update Property' : 'Complete Listing')}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    background-color: #f8fafc;
                    border: 2px solid transparent;
                    border-radius: 1rem;
                    outline: none;
                    transition: all;
                    font-weight: 700;
                    color: #334155;
                }
                .input-field:focus {
                    border-color: #cbd5e1;
                }
                .input-select {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    background-color: #f8fafc;
                    border: 2px solid transparent;
                    border-radius: 1rem;
                    outline: none;
                    transition: all;
                    font-weight: 700;
                    color: #475569;
                    appearance: none;
                }
                .input-select:focus {
                    border-color: #cbd5e1;
                }
                .label {
                    display: block;
                    font-size: 0.625rem;
                    font-weight: 900;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.5rem;
                }
            `}</style>
        </motion.div>
    );
};

export default PropertyForm;
