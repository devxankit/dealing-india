import { useState } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiCamera, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const AddProperty = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [media, setMedia] = useState([]); // { url, data }

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        totalArea: '',
        propertyType: 'Shop',
        listingType: 'Rent',
        price: {
            amount: '',
            maintenance: 'Excluded',
            utilityBill: 'Excluded',
            deposit: 0,
        },
        status: {
            furnishing: 'Unfurnished',
            propertyStatus: 'Ready',
        },
        location: {
            address: '',
            area: '',
            market: '',
            city: '',
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMedia(prev => [...prev, { data: reader.result, name: file.name }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const response = await api.post('/property/add', {
                ...formData,
                media: media.map(m => ({ url: m.data }))
            });

            if (response.success) {
                toast.success('Property listed successfully!');
                navigate('/b2b-vendor/properties');
            }
        } catch (error) {
            console.error('Error listing property:', error);
            toast.error(error.message || 'Failed to list property');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: "Basic Info", sub: "Type & Listing" },
        { id: 2, title: "Pricing", sub: "Rent & Deposit" },
        { id: 3, title: "Location", sub: "Address & Market" },
        { id: 4, title: "Media", sub: "Photos & Details" },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-slate-100 rounded-full shadow-sm transition-all">
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">List New Property</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Growth your business with Dealing India</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                {step > s.id ? <FiCheck /> : s.id}
                            </div>
                            <div className="hidden md:block text-center">
                                <p className={`text-xs font-black uppercase ${step >= s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{s.sub}</p>
                            </div>
                        </div>
                        {idx < steps.length - 1 && <div className={`h-[2px] flex-1 mx-2 transition-all ${step > s.id ? 'bg-slate-900' : 'bg-slate-100'}`} />}
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-[2.5rem] p-4 md:p-10 shadow-xl border border-gray-50 min-h-[500px] flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Listing Title <span className="text-red-500">*</span></label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="Prime Commercial Hub in Heart of City" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Property Type <span className="text-red-500">*</span></label>
                                    <select name="propertyType" value={formData.propertyType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        {['Shop', 'Office', 'Showroom', 'Godown', 'Factory', 'Commercial Building'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Listing Type <span className="text-red-500">*</span></label>
                                    <select name="listingType" value={formData.listingType} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        {['Sale', 'Rent', 'Lease'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Area (sq ft)</label>
                                    <input type="text" name="totalArea" value={formData.totalArea} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="1200 sq ft" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[120px]" placeholder="Describe your property features, amenities, and nearby landmarks..." />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Price Amount (₹) <span className="text-red-500">*</span></label>
                                    <input type="number" name="price.amount" value={formData.price.amount} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="50,000" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Security Deposit (₹)</label>
                                    <input type="number" name="price.deposit" value={formData.price.deposit} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="1,50,000" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Maintenance Charges</label>
                                    <select name="price.maintenance" value={formData.price.maintenance} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        <option value="Included">Included</option>
                                        <option value="Excluded">Excluded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Utility Bills</label>
                                    <select name="price.utilityBill" value={formData.price.utilityBill} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        <option value="Included">Included</option>
                                        <option value="Excluded">Excluded</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Address <span className="text-red-500">*</span></label>
                                    <textarea name="location.address" value={formData.location.address} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700 min-h-[100px]" placeholder="B-42, Corporate Tower, MG Road" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Area / Locality <span className="text-red-500">*</span></label>
                                    <input type="text" name="location.area" value={formData.location.area} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="Surat Textile Market" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">City <span className="text-red-500">*</span></label>
                                    <input type="text" name="location.city" value={formData.location.city} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-700" placeholder="Surat" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Property Media <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {media.map((img, idx) => (
                                        <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-100">
                                            <img src={img.data} alt="preview" className="w-full h-full object-cover" />
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
                                <p className="text-[10px] text-gray-400 mt-4 font-bold uppercase">* First image will be the cover photo</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Furnishing Status</label>
                                    <select name="status.furnishing" value={formData.status.furnishing} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        <option value="Full">Fully Furnished</option>
                                        <option value="Semi">Semi Furnished</option>
                                        <option value="Unfurnished">Unfurnished</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Construction Status</label>
                                    <select name="status.propertyStatus" value={formData.status.propertyStatus} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-2xl outline-none transition-all font-bold text-slate-600">
                                        <option value="New">Brand New</option>
                                        <option value="Ready">Ready to Move</option>
                                        <option value="Under Construction">Under Construction</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-50">
                    <button
                        disabled={step === 1}
                        onClick={() => setStep(s => s - 1)}
                        className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                        Back
                    </button>
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-800 shadow-xl shadow-slate-200"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            disabled={loading || media.length === 0}
                            onClick={handleSubmit}
                            className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-primary-700 shadow-xl shadow-primary-100 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Complete Listing'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AddProperty;
