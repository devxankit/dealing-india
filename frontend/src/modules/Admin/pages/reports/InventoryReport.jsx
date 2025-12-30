import { useState, useEffect } from 'react';
import { FiPackage, FiAlertCircle, FiTrendingDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ExportButton from '../../components/ExportButton';
import { formatPrice } from '../../../../shared/utils/helpers';
import api from '../../../../shared/utils/api';

const InventoryReport = () => {
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchInventoryReport();
  }, []);

  const fetchInventoryReport = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/reports/inventory');
      if (response.success && response.data) {
        setProducts(response.data.products || []);
        setLowStockProducts(response.data.lowStockProducts || []);
        setInventoryStats(response.data.stats || {
          totalProducts: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          totalValue: 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch inventory report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image}
            alt={value}
            className="w-10 h-10 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/50x50?text=Product';
            }}
          />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'stockQuantity',
      label: 'Stock',
      sortable: true,
      render: (value) => value.toLocaleString(),
    },
    {
      key: 'stock',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value === 'in_stock' ? 'bg-green-100 text-green-800' :
          value === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: 'value',
      label: 'Total Value',
      sortable: true,
      render: (_, row) => formatPrice(row.value || (row.price * (row.stockQuantity || 0))),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Inventory Report</h1>
        <p className="text-sm sm:text-base text-gray-600">View inventory status and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Products</p>
            <FiPackage className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{inventoryStats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">In Stock</p>
            <FiPackage className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{inventoryStats.inStock}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Low Stock</p>
            <FiAlertCircle className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Value</p>
            <FiTrendingDown className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(inventoryStats.totalValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex justify-end">
          <ExportButton
            data={products}
            headers={[
              { label: 'Product Name', accessor: (row) => row.name },
              { label: 'Stock', accessor: (row) => row.stockQuantity },
              { label: 'Status', accessor: (row) => row.stock },
              { label: 'Price', accessor: (row) => `$${row.price.toFixed(2)}` },
            ]}
            filename="inventory-report"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Low Stock Alert</h3>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : lowStockProducts.length > 0 ? (
          <DataTable
            data={lowStockProducts}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">No low stock products</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Products</h3>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : products.length > 0 ? (
          <DataTable
            data={products}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">No products found</p>
        )}
      </div>
    </motion.div>
  );
};

export default InventoryReport;

