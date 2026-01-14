import { useState } from "react";
import { FiCheck, FiX, FiFileText, FiEye } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../components/DataTable";
import toast from "react-hot-toast";

const B2BVendorPendingApprovals = () => {
    const [approvals] = useState([
        { _id: '1', companyName: 'TexTrend Pvt Ltd', email: 'info@textrend.com', documents: ['GST', 'Business License'], date: '2023-11-20' },
        { _id: '2', companyName: 'ElectroSource', email: 'admin@electrosource.co', documents: ['GST'], date: '2023-11-19' },
    ]);

    const handleApprove = (id) => {
        toast.success("B2B Vendor approved successfully!");
    };

    const handleReject = (id) => {
        toast.error("Application rejected.");
    };

    const columns = [
        { key: "companyName", label: "B2B Vendor Name", render: (val) => <span className="font-bold text-gray-800">{val}</span> },
        { key: "email", label: "Email Address" },
        {
            key: "documents",
            label: "Documents",
            render: (val) => (
                <div className="flex gap-2">
                    {val.map((doc, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {doc}
                        </span>
                    ))}
                </div>
            )
        },
        { key: "date", label: "Applied On" },
        {
            key: "actions",
            label: "Actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Details"><FiEye /></button>
                    <button onClick={() => handleApprove(row._id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><FiCheck /></button>
                    <button onClick={() => handleReject(row._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><FiX /></button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Pending Approvals</h1>
                <p className="text-gray-500">Review and verify new B2B vendor applications.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <DataTable
                    data={approvals}
                    columns={columns}
                    pagination={true}
                    itemsPerPage={10}
                />
            </div>
        </motion.div>
    );
};

export default B2BVendorPendingApprovals;
