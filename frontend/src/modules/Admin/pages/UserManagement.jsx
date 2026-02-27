import { useEffect, useState } from "react";
import { FiSearch, FiEye, FiUser } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../components/DataTable";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                <FiUser />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                  User Details
                </h2>
                <p className="text-xs text-gray-500">
                  #{user._id?.slice(-8)} &middot;{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <section>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Basic Info
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">
                      Name
                    </p>
                    <p className="font-semibold text-gray-800">
                      {user.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">
                      Email
                    </p>
                    <p className="font-semibold text-gray-800 break-all">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">
                      Phone
                    </p>
                    <p className="font-semibold text-gray-800">
                      {user.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase">
                      Role
                    </p>
                    <p className="font-semibold text-gray-800">
                      {user.role || "user"}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Business Info
                </h3>
                {user.businessInfo ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase">
                        Company
                      </p>
                      <p className="font-semibold text-gray-800">
                        {user.businessInfo.companyName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase">
                        Industry
                      </p>
                      <p className="font-semibold text-gray-800">
                        {user.businessInfo.industry || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase">
                        Company Type
                      </p>
                      <p className="font-semibold text-gray-800">
                        {user.businessInfo.companyType || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase">
                        GST Number
                      </p>
                      <p className="font-semibold text-gray-800">
                        {user.businessInfo.gstNumber || "N/A"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase">
                        Address
                      </p>
                      <p className="font-semibold text-gray-800">
                        {user.businessInfo.address?.fullAddress ||
                          user.businessInfo.address?.city ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No business information provided.
                  </p>
                )}
              </section>

              {Array.isArray(user.addresses) && user.addresses.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Saved Addresses
                  </h3>
                  <div className="space-y-2">
                    {user.addresses.map((addr, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                      >
                        <p className="font-semibold text-gray-800">
                          {addr.addressType || "Address"}{" "}
                          {addr.isDefault && (
                            <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase text-green-700">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="text-gray-600">
                          {addr.streetAddress}, {addr.city}, {addr.state} -{" "}
                          {addr.pincode}
                        </p>
                        {addr.phone && (
                          <p className="mt-0.5 text-gray-500">
                            Phone: {addr.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-gray-900 text-white hover:bg-black"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users", {
        params: {
          page: 1,
          limit: 100,
          search: searchQuery || "",
        },
      });
      if (response?.success) {
        setUsers(response.data || response.users || []);
      } else {
        toast.error(response?.message || "Failed to load users");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load users from server",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const columns = [
    {
      key: "name",
      label: "User",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <FiUser />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {val || "N/A"}
            </p>
            <p className="text-[11px] text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
    },
    {
      key: "businessInfo",
      label: "Company",
      render: (val) => val?.companyName || "N/A",
    },
    {
      key: "isEmailVerified",
      label: "Email Status",
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            val
              ? "bg-green-100 text-green-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {val ? "Verified" : "Pending"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Account",
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            val ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {val ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined On",
      render: (val) =>
        val ? new Date(val).toLocaleDateString("en-IN") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => handleView(row)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="View user details"
        >
          <FiEye />
        </button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-500 text-sm">
            View all registered users on the platform.
          </p>
        </div>
        <form
          onSubmit={handleSearch}
          className="relative w-full max-w-xs sm:max-w-sm"
        >
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm"
          />
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Loading users...
            </p>
          </div>
        ) : users.length > 0 ? (
          <DataTable
            data={users}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">
            No users found.
          </div>
        )}
      </div>

      <UserDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />
    </motion.div>
  );
};

export default UserManagement;

