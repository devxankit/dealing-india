import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "../../../../shared/utils/toast";
import api from "../../../../shared/utils/api";
import SubscriptionGate from "../../components/SubscriptionGate";

const ManageProducts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });

    // Fetch products from API
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/b2b-vendor/products', {
                params: {
                    page: 1,
                    limit: 100, // Get all products for now
                },
                silent: true
            });

            if (response.success && response.data) {
                // Transform API response to match table format
                const transformedProducts = response.data.products.map(product => {
                    // Extract category from root field or attributes
                    const categoryAttr = product.attributes?.find(attr => attr.name === 'category');
                    const category = product.category || categoryAttr?.value || 'N/A';

                    return {
                        _id: product._id,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        moq: product.minimumOrderQuantity || 1,
                        unit: product.unit || 'Pcs',
                        category: category,
                        visibility: product.isVisible ? 'Visible' : 'Hidden',
                        formType: 'standard',
                        storeName: product.vendorId?.storeName || product.vendorName || null,
                    };
                });
                setProducts(transformedProducts);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const cellImage = (row) => (
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                {row.image ? (
                    <img
                        src={row.image}
                        alt={row.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                    />
                ) : (
                    <FiPackage className="text-gray-400 text-xl" />
                )}
            </div>
            <div className="min-w-0">
                <span className="font-medium text-gray-800 block truncate">{row.name}</span>
            </div>
        </div>
    );

    const shopListingItemCell = (_, row) => {
        const firstItem = row.items?.[0];
        const itemImg = firstItem?.images?.[0];
        const itemName = firstItem?.itemName || firstItem?.name;
        return (
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                    {itemImg ? (
                        <img src={itemImg} alt={itemName} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                    ) : (
                        <FiPackage className="text-gray-400 text-xl" />
                    )}
                </div>
                <div className="min-w-0">
                    <span className="font-medium text-gray-800 block truncate">{itemName || 'Item'}</span>
                    {row.items?.length > 1 && (
                        <span className="text-xs text-gray-500 font-medium block truncate">+{row.items.length - 1} more</span>
                    )}
                </div>
            </div>
        );
    };

    const actionsCell = (_, row) => (
        <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/b2b-vendor/products/edit/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <FiEdit />
            </button>
            <button onClick={() => setDeleteModal({ isOpen: true, productId: row._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <FiTrash2 />
            </button>
        </div>
    );

    const statusCell = (value) => (
        <Badge variant={value === "Visible" ? "success" : "warning"}>
            {value.toUpperCase()}
        </Badge>
    );

    // Product Listing columns – product name, exp price, MOQ
    const productListingColumns = [
        { key: "name", label: "Product Name", sortable: true, render: (v, row) => cellImage(row) },
        { key: "category", label: "Category", sortable: true },
        { key: "price", label: "Exp. Price", sortable: true, render: (v) => `₹${v}` },
        { key: "moq", label: "Min. Order (MOQ)", sortable: true, render: (v, row) => `${v} ${row.unit}` },
        { key: "visibility", label: "Status", render: statusCell },
        { key: "actions", label: "Actions", render: actionsCell },
    ];

    const confirmDelete = async () => {
        try {
            await api.delete(`/b2b-vendor/products/${deleteModal.productId}`);
            toast.success("Product listing removed");
            setDeleteModal({ isOpen: false, productId: null });
            // Refresh products list
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manage Listings</h1>
                    <p className="text-gray-500">Overview of all your products visible to vendors.</p>
                </div>
                {/* Wrapped with SubscriptionGate to enforce product limits */}
                <SubscriptionGate action="product">
                    <button onClick={() => navigate("/b2b-vendor/products/add-product")} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-md">
                        <FiPlus /> Add New Listing
                    </button>
                </SubscriptionGate>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search listings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {(() => {
                            const filterProducts = (list) => list.filter(p => {
                                const q = searchQuery.toLowerCase().trim();
                                if (!q) return true;
                                const matchName = p.name?.toLowerCase().includes(q);
                                const matchCategory = p.category?.toLowerCase().includes(q);
                                const matchStore = p.storeName?.toLowerCase().includes(q);
                                return matchName || matchCategory || matchStore;
                            });
                            const productListings = filterProducts(products);

                            return (
                                <div className="space-y-10">
                                    {productListings.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-4">Product Listings</h3>
                                            <DataTable
                                                data={productListings}
                                                columns={productListingColumns}
                                                pagination={productListings.length > 10}
                                                itemsPerPage={10}
                                            />
                                        </div>
                                    )}
                                    {productListings.length === 0 && (
                                        <div className="text-center py-16 text-gray-400">
                                            <FiPackage className="mx-auto text-5xl mb-4 opacity-30" />
                                            <p className="font-bold uppercase tracking-widest text-sm">No listings found</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, productId: null })}
                onConfirm={confirmDelete}
                title="Remove Listing?"
                message="Are you sure you want to remove this product from your B2B catalog?"
                type="danger"
            />
        </motion.div>
    );
};

export default ManageProducts;
