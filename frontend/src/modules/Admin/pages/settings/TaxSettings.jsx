import { useState, useEffect } from 'react';
import { FiSave, FiPercent } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../../../shared/store/settingsStore';
import toast from 'react-hot-toast';

const TaxSettings = () => {
    const { settings, updateSettings, initialize } = useSettingsStore();
    const [taxData, setTaxData] = useState({
        taxName: 'Tax',
        taxType: 'percentage',
        taxValue: 0,
        isEnabled: false
    });

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (settings && settings.tax) {
            setTaxData(settings.tax);
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTaxData({
            ...taxData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateSettings('tax', taxData);
        toast.success('Tax settings saved successfully');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Tax & Pricing Management</h3>
                <p className="text-gray-600 mb-6">Configure global taxes or platform fees added to the order total.</p>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <input
                            type="checkbox"
                            id="isEnabled"
                            name="isEnabled"
                            checked={taxData.isEnabled}
                            onChange={handleChange}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="isEnabled" className="font-medium text-gray-700 cursor-pointer">Enable Tax / Platform Fee</label>
                    </div>

                    <div className={`space-y-6 ${!taxData.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                            <input
                                type="text"
                                name="taxName"
                                value={taxData.taxName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="e.g. GST, Platform Fee, Service Charge"
                            />
                            <p className="text-xs text-gray-500 mt-1">This name will be visible to customers at checkout.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Charge Type</label>
                                <select
                                    name="taxType"
                                    value={taxData.taxType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Value</label>
                                <input
                                    type="number"
                                    name="taxValue"
                                    value={taxData.taxValue}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-200 font-medium"
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

export default TaxSettings;
