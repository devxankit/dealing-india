import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiSearch, FiTrash2, FiEdit } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useCategoryStore } from '../../../../shared/store/categoryStore';
import CategoryForm from '../../components/Categories/CategoryForm';
import CategoryTree from '../../components/Categories/CategoryTree';
import ExportButton from '../../components/ExportButton';
import Pagination from '../../components/Pagination';
import AnimatedSelect from '../../components/AnimatedSelect';
import toast from 'react-hot-toast';

const ManageCategories = () => {
  const {
    categories,
    initialize,
    deleteCategory,
    isLoading
  } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [parentCategoryId, setParentCategoryId] = useState(null);
  const [viewMode, setViewMode] = useState('tree');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const name = category.name || '';
      const description = category.description || '';

      const matchesSearch =
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && category.isActive) ||
        (selectedStatus === 'inactive' && !category.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, selectedStatus]);

  // Pagination for list view
  const paginatedCategories = useMemo(() => {
    if (viewMode !== 'list') return filteredCategories;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, currentPage, itemsPerPage, viewMode]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

  const handleCreate = () => {
    setEditingCategory(null);
    setParentCategoryId(null);
    setShowForm(true);
  };

  const handleAddSubcategory = (parentId) => {
    setEditingCategory(null);
    setParentCategoryId(parentId);
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setParentCategoryId(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategory(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
    setParentCategoryId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Manage Categories</h1>
          <p className="text-sm sm:text-base text-gray-600">View and manage product categories</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-semibold text-sm shadow-sm"
        >
          <FiPlus />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <AnimatedSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'tree'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600'
                }`}
            >
              Tree View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === 'list'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600'
                }`}
            >
              List View
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <ExportButton
              data={filteredCategories}
              headers={[
                { label: 'ID', accessor: (row) => row.id },
                { label: 'Name', accessor: (row) => row.name },
                { label: 'Description', accessor: (row) => row.description || '' },
                { label: 'Status', accessor: (row) => (row.isActive ? 'Active' : 'Inactive') },
              ]}
              filename="categories"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[400px]">
        {isLoading && categories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch className="text-3xl text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No categories found matching your criteria</p>
          </div>
        ) : viewMode === 'tree' ? (
          <CategoryTree
            categories={categories}
            filteredCategoryIds={new Set(filteredCategories.map(cat => cat.id?.toString()))}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddSubcategory={handleAddSubcategory}
          />
        ) : (
          <>
            <div className="space-y-2">
              {paginatedCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  {category.image && (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-100"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {viewMode === 'list' && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCategories.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                className="mt-6 border-t pt-6"
              />
            )}
          </>
        )}
      </div>

      {showForm && (
        <CategoryForm
          category={editingCategory}
          parentId={parentCategoryId}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}
    </motion.div>
  );
};

export default ManageCategories;
