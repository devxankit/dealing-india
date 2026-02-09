import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEye } from "react-icons/fi";
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

    const columns = [
        {
            key: "title",
            label: "Product Name",
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 shadow-sm">
                        <img
                            src={row.image || "/placeholder-product.png"}
                            alt={val}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = "/placeholder-product.png"; }}
                        />
                    </div>
                    <span className="font-bold text-gray-800">{val}</span>
                </div>
            )
        },
        { key: "b2bVendor", label: "B2B Vendor" },
        { key: "price", label: "Price Range" },
        { key: "moq", label: "MOQ" },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                    {val}
                </span>
            )
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/admin/b2b-vendors/products/${row._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                    >
                        <FiEye />
                    </button>
                </div>
            )
        }
    ];

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
                        placeholder="Search products..."
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
                    <DataTable
                        data={products.filter(p =>
                            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.b2bVendor?.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        columns={columns}
                        pagination={true}
                        itemsPerPage={10}
                    />
                )}
            </div>
        </motion.div>
    );
};

export default B2BVendorProductListings;
