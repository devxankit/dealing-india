import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiPackage } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";
import Badge from "../../../../shared/components/Badge";
import ConfirmModal from "../../../Admin/components/ConfirmModal";
import toast from "react-hot-toast";

const ManageProducts = () => {
    const navigate = useNavigate();
    const [loading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Mock products data
    const [products, setProducts] = useState([
        { _id: '1', name: 'Cotton T-Shirts Bulk', price: 250, stockQuantity: 500, category: 'Textiles', visibility: 'Visible' },
        { _id: '2', name: 'Wireless Earbuds X10', price: 800, stockQuantity: 200, category: 'Electronics', visibility: 'Visible' },
        { _id: '3', name: 'Industrial Safety Gloves', price: 120, stockQuantity: 1000, category: 'Industrial', visibility: 'Visible' },
        { _id: '4', name: 'Premium Leather Wallets', price: 450, stockQuantity: 150, category: 'Handicrafts', visibility: 'Visible' },
        { _id: '5', name: 'Organic Cotton Bed Sheets', price: 1200, stockQuantity: 300, category: 'Textiles', visibility: 'Visible' },
        { _id: '6', name: 'Steel Cutlery Set (50pc)', price: 3500, stockQuantity: 50, category: 'Industrial', visibility: 'Visible' },
    ]);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });

    const columns = [
        {
            key: "name",
            label: "Product Name",
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FiPackage className="text-gray-400" />
                    </div>
                    <span className="font-medium text-gray-800">{value}</span>
                </div>
            ),
        },
        {
            key: "category",
            label: "Category",
            sortable: true,
        },
        {
            key: "price",
            label: "Base Price",
            sortable: true,
            render: (value) => `₹${value}`,
        },
        {
            key: "stockQuantity",
            label: "MOQ / Stock",
            sortable: true,
        },
        {
            key: "visibility",
            label: "Visibility",
            render: (value) => (
                <Badge variant={value === "Visible" ? "success" : "warning"}>
                    {value.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/b2b-vendor/products/edit/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <FiEdit />
                    </button>
                    <button onClick={() => setDeleteModal({ isOpen: true, productId: row._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <FiTrash2 />
                    </button>
                </div>
            ),
        },
    ];

    const confirmDelete = () => {
        setProducts(products.filter(p => p._id !== deleteModal.productId));
        toast.success("Product listing removed");
        setDeleteModal({ isOpen: false, productId: null });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Manage Listings</h1>
                    <p className="text-gray-500">Overview of all your products visible to vendors.</p>
                </div>
                <button onClick={() => navigate("/b2b-vendor/products/add-product")} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-md">
                    <FiPlus /> Add New Listing
                </button>
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

                <DataTable
                    data={products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
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
