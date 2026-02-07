import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiEye, FiSearch, FiMapPin, FiTag, FiTrendingUp, FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const ManageProperties = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const response = await api.get('/property/list');
            if (response.success) {
                setProperties(response.data);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;
        try {
            const response = await api.delete(`/property/delete/${id}`);
            if (response.success) {
                toast.success('Listing removed');
                fetchProperties();
            }
        } catch (error) {
            toast.error('Failed to delete property');
        }
    };

    const filteredProperties = properties.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.area.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-2 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manage Listings</h1>
                    <p className="text-gray-500 text-sm font-medium">You have {properties.length} properties listed.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="relative w-full sm:w-64 md:w-80">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or area..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-800 outline-none transition-all font-medium text-sm"
                        />
                    </div>
                    <button
                        onClick={() => navigate("/b2b-vendor/properties/add-property")}
                        className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg w-full sm:w-auto whitespace-nowrap"
                    >
                        <FiPlus className="text-lg" /> New Listing
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-[2.5rem]" />)}
                </div>
            ) : filteredProperties.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                    <FiTag size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">No properties found</h3>
                    <p className="text-sm text-gray-400">Try adjusting your search or add a new listing.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map((property) => (
                        <motion.div
                            key={property._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden group"
                        >
                            <div className="relative h-56">
                                <img
                                    src={property.media[0]?.url || 'https://via.placeholder.com/400x300'}
                                    alt={property.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black uppercase rounded-lg shadow-sm">
                                        {property.propertyType}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                                        {property.listingType}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="p-6">
                                <h3 className="text-lg font-black text-slate-800 mb-2 truncate">{property.title}</h3>
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-2 font-medium">
                                    <FiMapPin size={14} className="text-red-400" />
                                    <span className="truncate">{property.location.area}, {property.location.city}</span>
                                </div>

                                {property.totalArea && (
                                    <p className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-3">
                                        {property.totalArea}
                                    </p>
                                )}

                                <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">
                                    {property.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between py-4 border-t border-gray-50">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</p>
                                        <p className="text-xl font-black text-slate-900">₹{property.price.amount.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/b2b-vendor/properties/edit/${property._id}`)}
                                            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(property._id)}
                                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default ManageProperties;
