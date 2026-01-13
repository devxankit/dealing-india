import { useState } from "react";
import { FiSearch, FiDollarSign, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../../Admin/components/DataTable";

const B2BPriceRequests = () => {
    const [searchQuery, setSearchQuery] = useState("");

    const requests = [
        {
            _id: '1',
            wholesaler: 'Global Wholesale Hub',
            product: 'Premium Cotton T-Shirts',
            requestedQty: 500,
            offeredPrice: '₹145',
            status: 'Pending',
            date: '2023-11-20'
        },
        {
            _id: '2',
            wholesaler: 'TechFlow Electronics',
            product: 'Wireless Earbuds',
            requestedQty: 200,
            offeredPrice: '₹520',
            status: 'Accepted',
            date: '2023-11-15'
        },
    ];

    const columns = [
        {
            key: "wholesaler",
            label: "Wholesaler",
            render: (val) => <span className="font-bold text-gray-800">{val}</span>
        },
        { key: "product", label: "Product" },
        { key: "requestedQty", label: "Quantity" },
        {
            key: "offeredPrice",
            label: "Your Offer",
            render: (val) => <span className="text-primary-600 font-bold">{val}</span>
        },
        {
            key: "status",
            label: "Status",
            render: (val) => (
                <div className="flex items-center gap-1.5">
                    {val === 'Accepted' ? (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                            <FiCheckCircle /> {val}
                        </span>
                    ) : val === 'Rejected' ? (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">
                            <FiXCircle /> {val}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                            <FiClock /> {val}
                        </span>
                    )}
                </div>
            )
        },
        { key: "date", label: "Date" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">B2B Price Requests</h1>
                    <p className="text-gray-500">Track your negotiations and custom quotes with wholesalers.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search price requests..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={requests.filter(r =>
                        r.wholesaler.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.product.toLowerCase().includes(searchQuery.toLowerCase())
                    )}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default B2BPriceRequests;
