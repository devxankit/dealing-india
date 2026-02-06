import { useState, useEffect } from 'react';
import { FiSave, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../../../shared/store/settingsStore';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';

const OrdersCustomersSettings = () => {
  const { settings, updateSettings, initialize } = useSettingsStore();
  const [customersData, setCustomersData] = useState({});

  useEffect(() => {
    initialize();
    if (settings) {
      if (settings.customers) setCustomersData(settings.customers);
    }
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.customers) setCustomersData(settings.customers);
    }
  }, [settings]);

  const handleCustomersChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomersData({
      ...customersData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCustomerFeatureToggle = (feature) => {
    setCustomersData({
      ...customersData,
      customerAccountFeatures: {
        ...customersData.customerAccountFeatures,
        [feature]: !customersData.customerAccountFeatures?.[feature],
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings('customers', customersData);
    toast.success('Settings saved successfully');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Customers</h1>
        <p className="text-sm sm:text-base text-gray-600">Configure customer management settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-full overflow-x-hidden">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-2 text-primary-600 font-semibold">
            <FiUsers className="text-lg" />
            <span>Customer Settings</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-6">
          {/* Customers Section */}
          <div className="space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">Guest Checkout</h4>
                  <p className="text-xs text-gray-600">Allow customers to checkout without creating an account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 sm:ml-4">
                  <input
                    type="checkbox"
                    name="guestCheckoutEnabled"
                    checked={customersData.guestCheckoutEnabled !== false}
                    onChange={handleCustomersChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">Registration Required</h4>
                  <p className="text-xs text-gray-600">Require customers to register before checkout</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 sm:ml-4">
                  <input
                    type="checkbox"
                    name="registrationRequired"
                    checked={customersData.registrationRequired || false}
                    onChange={handleCustomersChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-800">Email Verification Required</h4>
                  <p className="text-xs text-gray-600">Require customers to verify their email address</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 sm:ml-4">
                  <input
                    type="checkbox"
                    name="emailVerificationRequired"
                    checked={customersData.emailVerificationRequired || false}
                    onChange={handleCustomersChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Customer Account Features</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0">Order History</span>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={customersData.customerAccountFeatures?.orderHistory !== false}
                      onChange={() => handleCustomerFeatureToggle('orderHistory')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0">Wishlist</span>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={customersData.customerAccountFeatures?.wishlist !== false}
                      onChange={() => handleCustomerFeatureToggle('wishlist')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0">Saved Addresses</span>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={customersData.customerAccountFeatures?.addresses !== false}
                      onChange={() => handleCustomerFeatureToggle('addresses')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200 mt-4 sm:mt-6">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 sm:px-6 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm sm:text-base w-full sm:w-auto"
            >
              <FiSave />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default OrdersCustomersSettings;

