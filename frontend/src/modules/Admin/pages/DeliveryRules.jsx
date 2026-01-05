import React, { useState, useEffect } from "react";
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSave,
    FiX,
    FiCheck,
    FiAlertCircle,
    FiTruck,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import api from "../../../shared/utils/api";

const DeliveryRules = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const initialFormState = {
        name: "",
        description: "",
        chargeType: "flexible",
        baseCharge: 0,
        pricePerAdditionalKg: 40,
        weightBrackets: [],
        distanceZones: {
            local: { basePrice: 30, multiplier: 1.0 },
            regional: { basePrice: 50, multiplier: 1.2 },
            national: { basePrice: 80, multiplier: 1.5 },
        },
        isActive: true,
        isDefault: false,
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/delivery-rules");
            setRules(response.data || []);
        } catch (error) {
            console.error("Error fetching rules:", error);
            toast.error("Failed to load delivery rules");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rule) => {
        setFormData({
            ...rule,
            // Ensure nested objects exist to avoid crashes
            distanceZones: rule.distanceZones || initialFormState.distanceZones,
            weightBrackets: rule.weightBrackets || [],
        });
        setEditingId(rule._id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this rule?")) return;
        try {
            await api.delete(`/admin/delivery-rules/${id}`);
            toast.success("Rule deleted successfully");
            fetchRules();
        } catch (error) {
            console.error("Error deleting rule:", error);
            toast.error(error.response?.data?.message || "Failed to delete rule");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/delivery-rules/${editingId}`, formData);
                toast.success("Rule updated successfully");
            } else {
                await api.post("/admin/delivery-rules", formData);
                toast.success("Rule created successfully");
            }
            setIsEditing(false);
            setEditingId(null);
            setFormData(initialFormState);
            fetchRules();
        } catch (error) {
            console.error("Error saving rule:", error);
            toast.error(error.response?.data?.message || "Failed to save rule");
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData(initialFormState);
    };

    // Helper to update form fields
    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Helper for nested fields
    const updateZoneField = (zone, field, value) => {
        setFormData((prev) => ({
            ...prev,
            distanceZones: {
                ...prev.distanceZones,
                [zone]: {
                    ...prev.distanceZones[zone],
                    [field]: parseFloat(value) || 0,
                },
            },
        }));
    };

    const addWeightBracket = () => {
        setFormData((prev) => ({
            ...prev,
            weightBrackets: [...prev.weightBrackets, { maxWeight: 0, price: 0 }],
        }));
    };

    const removeWeightBracket = (index) => {
        const newBrackets = [...formData.weightBrackets];
        newBrackets.splice(index, 1);
        setFormData((prev) => ({ ...prev, weightBrackets: newBrackets }));
    };

    const updateWeightBracket = (index, field, value) => {
        const newBrackets = [...formData.weightBrackets];
        newBrackets[index][field] = parseFloat(value) || 0;
        setFormData((prev) => ({ ...prev, weightBrackets: newBrackets }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <FiTruck className="text-primary-600" />
                        Delivery Rules
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage shipping charges based on weight and location zones.
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-200"
                    >
                        <FiPlus />
                        Add New Rule
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isEditing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingId ? "Edit Delivery Rule" : "Create New Delivery Rule"}
                            </h2>
                            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-8">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition"
                                        placeholder="e.g. Standard Shipping"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => updateField("description", e.target.value)}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition"
                                        placeholder="Brief description"
                                    />
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => updateField("isActive", e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        id="isActive"
                                    />
                                    <label htmlFor="isActive" className="font-medium text-gray-700 cursor-pointer">Active</label>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => updateField("isDefault", e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                        id="isDefault"
                                    />
                                    <label htmlFor="isDefault" className="font-medium text-gray-700 cursor-pointer">Set as Default Rule</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Base Handling Fee</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.baseCharge}
                                        onChange={(e) => updateField("baseCharge", parseFloat(e.target.value))}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Weight Brackets */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Weight Brackets
                                        </h3>
                                        <button type="button" onClick={addWeightBracket} className="text-sm text-primary-600 font-semibold hover:text-primary-700">
                                            + Add Bracket
                                        </button>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                        {formData.weightBrackets.map((bracket, index) => (
                                            <div key={index} className="flex gap-4 items-center">
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500 mb-1 block">Max Weight (kg)</label>
                                                    <input
                                                        type="number" step="0.1" min="0" required
                                                        value={bracket.maxWeight}
                                                        onChange={(e) => updateWeightBracket(index, "maxWeight", e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500 mb-1 block">Price (₹)</label>
                                                    <input
                                                        type="number" min="0" required
                                                        value={bracket.price}
                                                        onChange={(e) => updateWeightBracket(index, "price", e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border rounded-lg text-sm"
                                                    />
                                                </div>
                                                <button type="button" onClick={() => removeWeightBracket(index)} className="mt-5 text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        ))}
                                        {formData.weightBrackets.length === 0 && (
                                            <p className="text-sm text-center text-gray-400 py-4 italic">No weight brackets defined.</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Additional Kg (Fallback)</label>
                                        <input
                                            type="number" min="0"
                                            value={formData.pricePerAdditionalKg}
                                            onChange={(e) => updateField("pricePerAdditionalKg", parseFloat(e.target.value))}
                                            className="w-full px-4 py-2 border rounded-xl"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Applied if weight exceeds the highest bracket.</p>
                                    </div>
                                </div>

                                {/* Distance Zones */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Distance Zones
                                    </h3>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                        {['local', 'regional', 'national'].map((zone) => (
                                            <div key={zone} className="bg-white p-4 rounded-xl border border-gray-200">
                                                <h4 className="capitalize font-semibold text-gray-700 mb-3">{zone} Zone</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">Base Price (₹)</label>
                                                        <input
                                                            type="number" min="0"
                                                            value={formData.distanceZones[zone].basePrice}
                                                            onChange={(e) => updateZoneField(zone, "basePrice", e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:bg-white transition"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">Weight Application Multiplier</label>
                                                        <input
                                                            type="number" step="0.1" min="0"
                                                            value={formData.distanceZones[zone].multiplier}
                                                            onChange={(e) => updateZoneField(zone, "multiplier", e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:bg-white transition"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-200 flex items-center gap-2"
                                >
                                    <FiSave />
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    /* Rules List */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                            ))
                        ) : rules.length > 0 ? (
                            rules.map((rule) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={rule._id}
                                    className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md group relative overflow-hidden ${rule.isDefault ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-100'}`}
                                >
                                    {rule.isDefault && (
                                        <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                            Default
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{rule.name}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{rule.description || "No description"}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Base Handling:</span>
                                            <span className="font-medium">₹{rule.baseCharge}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Weight Brackets:</span>
                                            <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs">{rule.weightBrackets?.length || 0} brackets</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Excess Weight:</span>
                                            <span className="font-medium">₹{rule.pricePerAdditionalKg}/kg</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition"
                                            title="Edit"
                                        >
                                            <FiEdit2 size={18} />
                                        </button>
                                        {!rule.isDefault && (
                                            <button
                                                onClick={() => handleDelete(rule._id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <FiTruck size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No delivery rules found. Create one to get started.</p>
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeliveryRules;
