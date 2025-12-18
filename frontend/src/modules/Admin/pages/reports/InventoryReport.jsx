import { useState, useMemo } from 'react';
import { FiPackage, FiAlertCircle, FiTrendingDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import DataTable from '../../components/DataTable';
import ExportButton from '../../components/ExportButton';
import { products as initialProducts } from '../../../../data/products';

const InventoryReport = () => {
  const [products] = useState(() => {
    const saved = localStorage.getItem('admin-products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter(p => p.stock === 'in_stock').length;
    const lowStock = products.filter(p => p.stock === 'low_stock').length;
    const outOfStock = products.filter(p => p.stock === 'out_of_stock').length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);

    return { totalProducts, inStock, lowStock, outOfStock, totalValue };
  }, [products]);

  const lowStockProducts = products.filter(p => p.stock === 'low_stock' || p.stock === 'out_of_stock');

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
      render: (value) => `$${value.toFixed(2)}`,
    },
    {
      key: 'value',
      label: 'Total Value',
      sortable: true,
      render: (_, row) => `$${(row.price * row.stockQuantity).toFixed(2)}`,
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
          <p className="text-2xl font-bold text-gray-800">${inventoryStats.totalValue.toFixed(2)}</p>
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
        {lowStockProducts.length > 0 ? (
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
        <DataTable
          data={products}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      </div>
    </motion.div>
  );
};

export default InventoryReport;

