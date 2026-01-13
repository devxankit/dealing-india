import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUsers, FiClock, FiPackage, FiMessageCircle, FiTrendingUp, FiAlertCircle } from "react-icons/fi";

const Wholesalers = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            path: "/admin/wholesalers/manage-wholesalers",
            label: "Manage Wholesalers",
            icon: FiUsers,
            description: "View and manage all registered wholesalers",
            color: "blue",
        },
        {
            path: "/admin/wholesalers/pending-approvals",
            label: "Pending Approvals",
            icon: FiClock,
            description: "Review and approve new wholesaler applications",
            color: "orange",
            count: 5,
        },
        {
            path: "/admin/wholesalers/product-listings",
            label: "Product Listings",
            icon: FiPackage,
            description: "Oversee all products listed by wholesalers",
            color: "green",
        },
        {
            path: "/admin/wholesalers/communication-logs",
            label: "Communication Logs",
            icon: FiMessageCircle,
            description: "Monitor vendor-wholesaler interactions",
            color: "purple",
        },
        {
            path: "/admin/wholesalers/analytics",
            label: "Wholesaler Analytics",
            icon: FiTrendingUp,
            description: "B2B market performance and trends",
            color: "indigo",
        },
        {
            path: "/admin/wholesalers/dispute-resolution",
            label: "Dispute Resolution",
            icon: FiAlertCircle,
            description: "Manage and resolve B2B disputes",
            color: "red",
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Wholesaler Management</h1>
                <p className="text-gray-500">Oversee the B2B ecosystem and wholesaler operations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ y: -5 }}
                        onClick={() => navigate(item.path)}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-4 rounded-2xl bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-600 group-hover:text-white transition-colors`}>
                                <item.icon className="text-2xl" />
                            </div>
                            {item.count && (
                                <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">
                                    {item.count}+
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default Wholesalers;
