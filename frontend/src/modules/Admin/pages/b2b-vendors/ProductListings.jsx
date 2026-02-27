import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEye, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const B2BVendorProductListings = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/b2b-products', {
                params: {
                    page: 1,
                    limit: 100,
                }
            });

            if (response.success && response.data) {
                setProducts(response.data.products || []);
            }
        } catch (error) {
            console.error('Error fetching B2B products:', error);
            toast.error('Failed to load B2B products');
        } finally {
            setLoading(false);
        }
    };

    const filterBySearch = (list) => list.filter(p => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchVendor = p.b2bVendor?.toLowerCase().includes(q);
        return matchTitle || matchVendor;
    });

    const statusCell = (val) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{val}</span>
    );

    const actionsCell = (_, row) => (
        <button onClick={() => navigate(`/admin/b2b-vendors/products/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Details">
            <FiEye />
        </button>
    );

    const productColumns = [
        {
            key: "title",
            label: "Product Name",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-sm">
                        <img src={row.image || "/placeholder-product.png"} alt={val} className="w-full h-full object-cover" onError={(e) => { e.target.src = "/placeholder-product.png"; }} />
                    </div>
                    <span className="font-bold text-gray-800">{val}</span>
                </div>
            )
        },
        { key: "b2bVendor", label: "B2B Vendor" },
        { key: "price", label: "Price Range" },
        { key: "moq", label: "MOQ" },
        { key: "status", label: "Status", render: (v) => statusCell(v) },
        { key: "actions", label: "Actions", render: actionsCell }
    ];

    const productListings = filterBySearch(products);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">B2B Vendor Product Listings</h1>
                    <p className="text-gray-500">View all B2B vendor product listings.</p>
                </div>
                <div className="relative w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products & items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {productListings.length > 0 && (
                            <div className="mb-10">
                                <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4">Product Listings</h3>
                                <DataTable data={productListings} columns={productColumns} pagination={productListings.length > 10} itemsPerPage={10} />
                            </div>
                        )}
                        {productListings.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <FiPackage className="mx-auto text-5xl mb-4 opacity-30" />
                                <p className="font-bold uppercase tracking-widest text-sm">No listings found</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default B2BVendorProductListings;
