import { useState } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "../../../shared/utils/toast";
import imageCompression from 'browser-image-compression';
import api from "../../../shared/utils/api";

const PlotForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [media, setMedia] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        listingType: 'Sale',
        description: '',
        propertyType: 'Plot',

        // Pricing
        saleDetails: {
            priceMin: '',
            priceMax: '',
            priceUnit: 'Lakh',
        },
        rentDetails: {
            monthlyRent: '',
            rentUnit: 'Thousand',
            depositAmount: '',
            depositUnit: 'Thousand',
            maintenance: 'Excluded',
            veraBill: 'Excluded'
        },
        leaseDetails: {
            monthlyLeaseRate: '',
            leaseUnit: 'Lakh',
            depositAmount: '',
            depositUnit: 'Thousand',
            leaseDurationYears: ''
        },

        // Plot Specific Details
        plotDetails: {
            plotArea: '',
            builtUpArea: '',
            floors: 'G+1',
            masterRoom: 'No',
            bedrooms: '',
            bathrooms: '',
            balcony: '',
            terrace: 'No',
            furnishing: 'Unfurnished',
            ageOfProperty: '',
            privateFacilities: {
                privateParking: 'No',
                gardenArea: 'No',
                personalBorewell: 'No',
                solarSystem: 'No',
                storeRoom: 'No',
                servantRoom: 'No'
            },
            amenities: {
                parking: 'Open',
                security: 'No',
                cctv: 'No',
                powerBackup: 'No',
                waterSupply: 'Municipal',
                gasPipeline: 'No',
                swimmingPool: 'No',
                gym: 'No',
                garden: 'No',
                childrenPlayArea: 'No',
                clubHouse: 'No',
                temple: 'No',
                societyOffice: 'No'
            },
            legal: {
                loanAvailable: 'No',
                reraApproved: 'No',
                maintenanceCharges: '',
                propertyTaxStatus: ''
            }
        },

        location: {
            address: '',
            area: '',
            market: '',
            city: ''
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const parts = name.split('.');
            if (parts.length === 2) {
                const [parent, child] = parts;
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            } else if (parts.length === 3) {
                const [grandparent, parent, child] = parts;
                setFormData(prev => ({
                    ...prev,
                    [grandparent]: {
                        ...prev[grandparent],
                        [parent]: { ...prev[grandparent][parent], [child]: value }
                    }
                }));
            } else if (parts.length === 4) {
                const [gp, p, c, gc] = parts;
                setFormData(prev => ({
                    ...prev,
                    [gp]: {
                        ...prev[gp],
                        [p]: {
                            ...prev[gp][p],
                            [c]: { ...prev[gp][p][c], [gc]: value }
                        }
                    }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleToggle = (name, value) => {
        const parts = name.split('.');
        if (parts.length === 4) {
            const [gp, p, c, gc] = parts;
            setFormData(prev => ({
                ...prev,
                [gp]: {
                    ...prev[gp],
                    [p]: {
                        ...prev[gp][p],
                        [c]: { ...prev[gp][p][c], [gc]: value }
                    }
                }
            }));
        } else if (parts.length === 3) {
            const [grandparent, parent, child] = parts;
            setFormData(prev => ({
                ...prev,
                [grandparent]: {
                    ...prev[grandparent],
                    [parent]: { ...prev[grandparent][parent], [child]: value }
                }
            }));
        } else if (parts.length === 2) {
            const [parent, child] = parts;
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (media.length + files.length > 50) {
            toast.error('Maximum 50 images allowed');
            return;
        }

        const toastId = toast.loading('Processing images...');
        try {
            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
            const results = await Promise.all(
                files.map(async (file) => {
                    const compressed = await imageCompression(file, options);
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({ data: reader.result, name: file.name });
                        reader.readAsDataURL(compressed);
                    });
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

    const handleSubmit = async () => {
        if (!formData.title || !formData.location.address || !formData.location.city) {
            toast.error("Please fill all required fields");
            return;
        }

        const parseNumber = (val) => {
            if (!val) return null;
            const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            return isNaN(parsed) ? null : parsed;
        };

        try {
            setLoading(true);

            // Deep copy and format numerical fields
            const payload = {
                ...formData,
                plotDetails: {
                    ...formData.plotDetails,
                    plotArea: parseNumber(formData.plotDetails.plotArea),
                    builtUpArea: parseNumber(formData.plotDetails.builtUpArea),
                    bedrooms: parseNumber(formData.plotDetails.bedrooms),
                    bathrooms: parseNumber(formData.plotDetails.bathrooms),
                    balcony: parseNumber(formData.plotDetails.balcony),
                },
                media: media.map(m => ({ url: m.data }))
            };

            const response = await api.post('/property/add', payload);
            if (response.success) {
                toast.success('Plot listed successfully!');
                navigate('/b2b-vendor/properties/manage-properties');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to list plot');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: "Basic Info", sub: "Step 1" },
        { id: 2, title: "Pricing", sub: "Step 2" },
        { id: 3, title: "Plot Details", sub: "Step 3" },
        { id: 4, title: "Facilities", sub: "Step 4" },
        { id: 5, title: "Legal & Media", sub: "Step 5" },
    ];

    const renderToggle = (name, currentValue) => (
        <div className="flex gap-2">
            {['Yes', 'No'].map(val => (
                <button
                    key={val}
                    type="button"
                    onClick={() => handleToggle(name, val)}
                    className={`flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold border-2 transition-all ${currentValue === val
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                        }`}
                >
                    {val}
                </button>
            ))}
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Add Plot</h1>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Growth your business with Dealing India</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center bg-white p-3 md:p-6 rounded-3xl shadow-sm border border-gray-50 overflow-x-auto gap-1 md:gap-4">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1.5 md:gap-2 flex-1">
                            <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all ${step >= s.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {step > s.id ? <FiCheck /> : s.id}
                            </div>
                            <div className="hidden md:block text-center text-[10px] font-black uppercase whitespace-nowrap">{s.title}</div>
                        </div>
                        {idx < steps.length - 1 && <div className={`h-[1px] md:h-[2px] flex-1 mx-0.5 md:mx-2 transition-all min-w-[8px] ${step > s.id ? 'bg-primary-600' : 'bg-slate-100'}`} />}
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-50 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Title <span className="text-red-500">*</span></label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="E.g. Residential Plot in Prime Location" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Listing Type <span className="text-red-500">*</span></label>
                                    <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        {['Sale', 'Rent', 'Lease'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Description <span className="text-red-500">*</span></label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[100px]" placeholder="Brief description..." />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            {formData.listingType === 'Sale' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Sale Details</div>
                                    <input type="number" name="saleDetails.priceMin" placeholder="Min Price" value={formData.saleDetails.priceMin} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <input type="number" name="saleDetails.priceMax" placeholder="Max Price" value={formData.saleDetails.priceMax} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <select name="saleDetails.priceUnit" value={formData.saleDetails.priceUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            )}

                            {formData.listingType === 'Rent' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Rent Details</div>
                                    <input type="number" name="rentDetails.monthlyRent" placeholder="Monthly Rent" value={formData.rentDetails.monthlyRent} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <select name="rentDetails.rentUnit" value={formData.rentDetails.rentUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="rentDetails.depositAmount" placeholder="Deposit Amount" value={formData.rentDetails.depositAmount} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <select name="rentDetails.depositUnit" value={formData.rentDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase">Maintenance</label>
                                        <select name="rentDetails.maintenance" value={formData.rentDetails.maintenance} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase">Vera Bill</label>
                                        <select name="rentDetails.veraBill" value={formData.rentDetails.veraBill} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                            <option value="Included">Included</option>
                                            <option value="Excluded">Excluded</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {formData.listingType === 'Lease' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 text-xl font-black text-slate-900 uppercase">Lease Details</div>
                                    <input type="number" name="leaseDetails.monthlyLeaseRate" placeholder="Monthly Lease Rate" value={formData.leaseDetails.monthlyLeaseRate} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <select name="leaseDetails.leaseUnit" value={formData.leaseDetails.leaseUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="leaseDetails.depositAmount" placeholder="Deposit Amount" value={formData.leaseDetails.depositAmount} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <select name="leaseDetails.depositUnit" value={formData.leaseDetails.depositUnit} onChange={handleChange} className="w-full px-6 py-4 bg-primary-50 text-primary-700 rounded-2xl font-bold">
                                        {['Rs', 'Thousand', 'Lakh', 'Crore'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <input type="number" name="leaseDetails.leaseDurationYears" placeholder="Duration (Years)" value={formData.leaseDetails.leaseDurationYears} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="text-xl font-black text-slate-900 uppercase">Plot Details</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase">Plot Area</label>
                                    <input type="text" name="plotDetails.plotArea" value={formData.plotDetails.plotArea} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 2000 sq ft" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Built-up Area</label>
                                    <input type="text" name="plotDetails.builtUpArea" value={formData.plotDetails.builtUpArea} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 1500 sq ft" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Floors</label>
                                    <select name="plotDetails.floors" value={formData.plotDetails.floors} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                        {['G+1', 'G+2'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase">Master Room</span>
                                    <div className="w-32">{renderToggle('plotDetails.masterRoom', formData.plotDetails.masterRoom)}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Bedrooms</label>
                                    <input type="text" name="plotDetails.bedrooms" value={formData.plotDetails.bedrooms} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 3" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Bathrooms</label>
                                    <input type="text" name="plotDetails.bathrooms" value={formData.plotDetails.bathrooms} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 2" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Balcony</label>
                                    <input type="text" name="plotDetails.balcony" value={formData.plotDetails.balcony} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. 1" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase">Terrace</span>
                                    <div className="w-32">{renderToggle('plotDetails.terrace', formData.plotDetails.terrace)}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Furnishing</label>
                                    <select name="plotDetails.furnishing" value={formData.plotDetails.furnishing} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold">
                                        {['Unfurnished', 'Semi Furnished', 'Fully Furnished'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase">Age of Property</label>
                                    <input type="text" name="plotDetails.ageOfProperty" value={formData.plotDetails.ageOfProperty} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" placeholder="E.g. New" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary-600">Private Facilities</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {['privateParking', 'gardenArea', 'personalBorewell', 'solarSystem', 'storeRoom', 'servantRoom'].map(field => (
                                            <div key={field} className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                <div className="w-32">{renderToggle(`plotDetails.privateFacilities.${field}`, formData.plotDetails.privateFacilities[field])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-primary-600">Common & Premium</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase">Parking</span>
                                            <select name="plotDetails.amenities.parking" value={formData.plotDetails.amenities.parking} onChange={handleChange} className="w-32 px-3 py-2 bg-slate-50 rounded-xl font-bold text-xs">
                                                <option value="Covered">Covered</option>
                                                <option value="Open">Open</option>
                                            </select>
                                        </div>
                                        {['security', 'cctv', 'powerBackup', 'swimmingPool', 'gym', 'clubHouse'].map(field => (
                                            <div key={field} className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase">{field.replace(/([A-Z])/g, ' $1')}</span>
                                                <div className="w-32">{renderToggle(`plotDetails.amenities.${field}`, formData.plotDetails.amenities[field])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="text-xl font-black text-slate-900 uppercase">Legal & Financial</div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase">Loan Available</span>
                                            <div className="w-32">{renderToggle('plotDetails.legal.loanAvailable', formData.plotDetails.legal.loanAvailable)}</div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase">RERA Approved</span>
                                            <div className="w-32">{renderToggle('plotDetails.legal.reraApproved', formData.plotDetails.legal.reraApproved)}</div>
                                        </div>
                                        <input type="text" name="plotDetails.legal.maintenanceCharges" placeholder="Maintenance Charges" value={formData.plotDetails.legal.maintenanceCharges} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                        <input type="text" name="plotDetails.legal.propertyTaxStatus" placeholder="Property Tax Status" value={formData.plotDetails.legal.propertyTaxStatus} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    </div>

                                    <div className="text-xl font-black text-slate-900 uppercase pt-4">Location</div>
                                    <div className="space-y-4">
                                        <textarea name="location.address" placeholder="Full Address *" value={formData.location.address} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold min-h-[80px]" />
                                        <div className="grid grid-cols-3 gap-2">
                                            <input name="location.city" placeholder="City *" value={formData.location.city} onChange={handleChange} className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-xs" />
                                            <input name="location.area" placeholder="Area" value={formData.location.area} onChange={handleChange} className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-xs" />
                                            <input name="location.market" placeholder="Market" value={formData.location.market} onChange={handleChange} className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-xs" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="text-xl font-black text-slate-900 uppercase">Media</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {media.map((img, idx) => (
                                            <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100">
                                                <img src={img.data} alt="preview" className="w-full h-full object-cover" />
                                                <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"><FiTrash2 size={12} /></button>
                                            </div>
                                        ))}
                                        {media.length < 50 && (
                                            <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-400">
                                                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                                <FiPlus size={24} />
                                                <span className="text-[10px] font-bold uppercase">Add Photo</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-50">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Previous</button>
                    ) : <div />}

                    {step < 5 ? (
                        <button onClick={() => setStep(s => s + 1)} className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all">Next Step</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50">
                            {loading ? 'Processing...' : 'Submit Listing'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default PlotForm;
