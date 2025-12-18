import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiMapPin, FiEdit, FiTrash2, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Header from '../components/Layout/Header';
import Navbar from '../components/Layout/Navbar';
import Footer from '../components/Layout/Footer';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import { useAddressStore } from '../../../shared/store/addressStore';
import useResponsiveHeaderPadding from '../../../shared/hooks/useResponsiveHeaderPadding';

const Addresses = () => {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } =
    useAddressStore();
  const { responsivePadding } = useResponsiveHeaderPadding();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    if (editingAddress) {
      updateAddress(editingAddress.id, data);
      toast.success('Address updated successfully!');
    } else {
      addAddress(data);
      toast.success('Address added successfully!');
    }
    reset();
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    reset(address);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddress(id);
      toast.success('Address deleted successfully!');
    }
  };

  const handleCancel = () => {
    reset();
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 w-full overflow-x-hidden">
          <Header />
          <Navbar />
          <main className="w-full overflow-x-hidden" style={{ paddingTop: `${responsivePadding}px` }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-2">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-800">Saved Addresses</h1>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 hover:scale-105"
                  >
                    <FiPlus />
                    Add New Address
                  </button>
                </div>

                {/* Address Form Modal */}
                <AnimatePresence>
                  {isFormOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                      onClick={handleCancel}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-gray-800">
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                          </h2>
                          <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <FiX className="text-xl text-gray-600" />
                          </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                          {/* Address Label */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Address Label
                            </label>
                            <input
                              type="text"
                              {...register('name', { required: 'Address label is required' })}
                              className={`w-full px-4 py-3 rounded-xl border-2 ${
                                errors.name
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-green-500'
                              } focus:outline-none transition-colors`}
                              placeholder="Home, Work, etc."
                            />
                            {errors.name && (
                              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                            )}
                          </div>

                          {/* Full Name */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Full Name
                            </label>
                            <input
                              type="text"
                              {...register('fullName', { required: 'Full name is required' })}
                              className={`w-full px-4 py-3 rounded-xl border-2 ${
                                errors.fullName
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-green-500'
                              } focus:outline-none transition-colors`}
                              placeholder="John Doe"
                            />
                            {errors.fullName && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.fullName.message}
                              </p>
                            )}
                          </div>

                          {/* Phone */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              {...register('phone', { required: 'Phone number is required' })}
                              className={`w-full px-4 py-3 rounded-xl border-2 ${
                                errors.phone
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-green-500'
                              } focus:outline-none transition-colors`}
                              placeholder="1234567890"
                            />
                            {errors.phone && (
                              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                            )}
                          </div>

                          {/* Address */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              {...register('address', { required: 'Address is required' })}
                              className={`w-full px-4 py-3 rounded-xl border-2 ${
                                errors.address
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-green-500'
                              } focus:outline-none transition-colors`}
                              placeholder="123 Main Street"
                            />
                            {errors.address && (
                              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                            )}
                          </div>

                          {/* City, State, Zip */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                {...register('city', { required: 'City is required' })}
                                className={`w-full px-4 py-3 rounded-xl border-2 ${
                                  errors.city
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-gray-200 focus:border-green-500'
                                } focus:outline-none transition-colors`}
                                placeholder="New York"
                              />
                              {errors.city && (
                                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                State
                              </label>
                              <input
                                type="text"
                                {...register('state', { required: 'State is required' })}
                                className={`w-full px-4 py-3 rounded-xl border-2 ${
                                  errors.state
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-gray-200 focus:border-green-500'
                                } focus:outline-none transition-colors`}
                                placeholder="NY"
                              />
                              {errors.state && (
                                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Zip Code
                              </label>
                              <input
                                type="text"
                                {...register('zipCode', { required: 'Zip code is required' })}
                                className={`w-full px-4 py-3 rounded-xl border-2 ${
                                  errors.zipCode
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-gray-200 focus:border-green-500'
                                } focus:outline-none transition-colors`}
                                placeholder="10001"
                              />
                              {errors.zipCode && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.zipCode.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Country */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Country
                            </label>
                            <input
                              type="text"
                              {...register('country', { required: 'Country is required' })}
                              className={`w-full px-4 py-3 rounded-xl border-2 ${
                                errors.country
                                  ? 'border-red-300 focus:border-red-500'
                                  : 'border-gray-200 focus:border-green-500'
                              } focus:outline-none transition-colors`}
                              placeholder="United States"
                            />
                            {errors.country && (
                              <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 pt-4">
                            <button
                              type="submit"
                              className="flex-1 gradient-green text-white py-3 rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 flex items-center justify-center gap-2"
                            >
                              <FiCheck />
                              {editingAddress ? 'Update Address' : 'Add Address'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancel}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Addresses List */}
                <div className="space-y-4">
                  {addresses.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <FiMapPin className="text-6xl text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-800 mb-2">No addresses saved</h3>
                      <p className="text-gray-600 mb-6">
                        Add your first address to make checkout faster.
                      </p>
                      <button
                        onClick={() => setIsFormOpen(true)}
                        className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300"
                      >
                        Add Address
                      </button>
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <motion.div
                        key={address.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <FiMapPin className="text-primary-600 text-xl" />
                              <h3 className="font-bold text-gray-800 text-lg">{address.name}</h3>
                              {address.isDefault && (
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-gray-700 space-y-1">
                              <p className="font-semibold">{address.fullName}</p>
                              <p>{address.address}</p>
                              <p>
                                {address.city}, {address.state} {address.zipCode}
                              </p>
                              <p>{address.country}</p>
                              <p className="text-gray-600">Phone: {address.phone}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {!address.isDefault && (
                              <button
                                onClick={() => setDefaultAddress(address.id)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(address)}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <FiEdit />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(address.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default Addresses;

