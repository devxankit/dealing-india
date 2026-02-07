import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiSave } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const B2BCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState({ categoryId: null, index: null });
    const [addingSubcategory, setAddingSubcategory] = useState(null); // Track which category is adding subcategory
    const [newSubcategoryName, setNewSubcategoryName] = useState(''); // Store new subcategory name

    const [formData, setFormData] = useState({
        categoryName: '',
        subcategoryName: ''
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/b2b-categories');
            if (response.success) {
                // Map _id to id for frontend compatibility
                const categories = (response.data || []).map(cat => ({
                    ...cat,
                    id: cat._id || cat.id
                }));
                setCategories(categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error(error.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!formData.categoryName.trim()) {
            toast.error('Category name is required');
            return;
        }
        if (!formData.subcategoryName.trim()) {
            toast.error('Subcategory name is required');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/admin/b2b-categories', {
                name: formData.categoryName.trim(),
                subcategoryName: formData.subcategoryName.trim()
            });
            if (response.success) {
                toast.success('Category added successfully');
                setFormData({ categoryName: '', subcategoryName: '' });
                setShowAddForm(false);
                loadCategories();
            }
        } catch (error) {
            console.error('Error adding category:', error);
            toast.error(error.response?.data?.message || 'Failed to add category');
        } finally {
            setLoading(false);
        }
    };

    const handleStartAddSubcategory = (categoryId) => {
        setAddingSubcategory(categoryId);
        setNewSubcategoryName('');
    };

    const handleCancelAddSubcategory = () => {
        setAddingSubcategory(null);
        setNewSubcategoryName('');
    };

    const handleAddSubcategory = async (categoryId) => {
        if (!newSubcategoryName.trim()) {
            toast.error('Subcategory name is required');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(`/admin/b2b-categories/${categoryId}/subcategories`, {
                subcategoryName: newSubcategoryName.trim()
            });
            if (response.success) {
                toast.success('Subcategory added');
                setAddingSubcategory(null);
                setNewSubcategoryName('');
                loadCategories();
            }
        } catch (error) {
            console.error('Error adding subcategory:', error);
            toast.error(error.response?.data?.message || 'Failed to add subcategory');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId, categoryName) => {
        if (window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
            try {
                setLoading(true);
                const response = await api.delete(`/admin/b2b-categories/${categoryId}`);
                if (response.success) {
                    toast.success('Category deleted');
                    loadCategories();
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                toast.error(error.response?.data?.message || 'Failed to delete category');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteSubcategory = async (categoryId, subcategoryName) => {
        if (window.confirm(`Are you sure you want to delete "${subcategoryName}"?`)) {
            try {
                setLoading(true);
                const response = await api.delete(`/admin/b2b-categories/${categoryId}/subcategories`, {
                    data: { subcategoryName }
                });
                if (response.success) {
                    toast.success('Subcategory deleted');
                    loadCategories();
                }
            } catch (error) {
                console.error('Error deleting subcategory:', error);
                toast.error(error.response?.data?.message || 'Failed to delete subcategory');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleStartEditCategory = (category) => {
        setEditingCategory({ id: category.id, name: category.name });
    };

    const handleSaveCategoryEdit = async () => {
        if (!editingCategory.name.trim()) {
            toast.error('Category name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            const response = await api.put(`/admin/b2b-categories/${editingCategory.id}`, {
                name: editingCategory.name.trim()
            });
            if (response.success) {
                toast.success('Category updated');
                setEditingCategory(null);
                loadCategories();
            }
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error(error.response?.data?.message || 'Failed to update category');
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditSubcategory = (categoryId, subcategoryName, index) => {
        setEditingSubcategory({ categoryId, index, name: subcategoryName });
    };

    const handleSaveSubcategoryEdit = async () => {
        if (!editingSubcategory.name.trim()) {
            toast.error('Subcategory name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            const response = await api.patch(`/admin/b2b-categories/${editingSubcategory.categoryId}/subcategories`, {
                index: editingSubcategory.index,
                newName: editingSubcategory.name.trim()
            });
            if (response.success) {
                toast.success('Subcategory updated');
                setEditingSubcategory({ categoryId: null, index: null });
                loadCategories();
            }
        } catch (error) {
            console.error('Error updating subcategory:', error);
            toast.error(error.response?.data?.message || 'Failed to update subcategory');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">B2B Categories</h1>
                    <p className="text-gray-500 mt-1">Manage categories and subcategories for B2B products</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg"
                >
                    <FiPlus /> Add Category
                </button>
            </div>

            {/* Add Category Form Modal */}
            <AnimatePresence>
                {showAddForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Add New Category</h2>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({ categoryName: '', subcategoryName: '' });
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Category Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.categoryName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, categoryName: e.target.value }))}
                                        placeholder="e.g., Electronics"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                        autoFocus
                                    />
                                </div>
                                {/* Image input removed */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Subcategory Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.subcategoryName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, subcategoryName: e.target.value }))}
                                        placeholder="e.g., Smart Devices"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({ categoryName: '', subcategoryName: '' });
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCategory}
                                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
                                >
                                    Add Category
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && categories.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-gray-500">Loading categories...</p>
                </div>
            )}

            {/* Categories List */}
            {!loading && categories.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiPlus className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Categories Yet</h3>
                    <p className="text-gray-500 mb-6">Start by adding your first category</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
                    >
                        Add Category
                    </button>
                </div>
            ) : !loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                        >
                            {/* Category Header */}
                            <div className="flex items-start justify-between mb-4">
                                {editingCategory?.id === category.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingCategory.name}
                                            onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveCategoryEdit}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                        >
                                            <FiCheck className="text-lg" />
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"
                                        >
                                            <FiX className="text-lg" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-gray-800 flex-1">{category.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleStartEditCategory(category)}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                                title="Edit Category"
                                            >
                                                <FiEdit2 className="text-sm" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Delete Category"
                                            >
                                                <FiTrash2 className="text-sm" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Subcategories List */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Subcategories</span>
                                    {addingSubcategory !== category.id && (
                                        <button
                                            onClick={() => handleStartAddSubcategory(category.id)}
                                            className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <FiPlus className="text-xs" /> Add
                                        </button>
                                    )}
                                </div>

                                {/* Add Subcategory Input */}
                                {addingSubcategory === category.id && (
                                    <div className="flex items-center gap-2 p-2 bg-primary-50 border border-primary-200 rounded-lg mb-2">
                                        <input
                                            type="text"
                                            value={newSubcategoryName}
                                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                                            placeholder="Enter subcategory name..."
                                            className="flex-1 px-3 py-2 bg-white border border-primary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddSubcategory(category.id);
                                                } else if (e.key === 'Escape') {
                                                    handleCancelAddSubcategory();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => handleAddSubcategory(category.id)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Save"
                                        >
                                            <FiCheck className="text-sm" />
                                        </button>
                                        <button
                                            onClick={handleCancelAddSubcategory}
                                            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                                            title="Cancel"
                                        >
                                            <FiX className="text-sm" />
                                        </button>
                                    </div>
                                )}

                                {category.subcategories && category.subcategories.length > 0 ? (
                                    <div className="space-y-1">
                                        {category.subcategories.map((sub, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group hover:bg-gray-100"
                                            >
                                                {editingSubcategory.categoryId === category.id && editingSubcategory.index === index ? (
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editingSubcategory.name}
                                                            onChange={(e) => setEditingSubcategory(prev => ({ ...prev, name: e.target.value }))}
                                                            className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveSubcategoryEdit}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <FiCheck className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSubcategory({ categoryId: null, index: null })}
                                                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                                        >
                                                            <FiX className="text-sm" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm text-gray-700 flex-1">{sub}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleStartEditSubcategory(category.id, sub, index)}
                                                                className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                                                                title="Edit"
                                                            >
                                                                <FiEdit2 className="text-xs" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSubcategory(category.id, sub)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <FiTrash2 className="text-xs" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No subcategories yet</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default B2BCategories;
