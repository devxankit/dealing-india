import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';

/**
 * Get sales report
 */
export const getSalesReport = async (filters = {}) => {
  try {
    const { startDate, endDate } = filters;

    // Build query
    const query = {};
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('customerId', 'name email')
      .sort({ orderDate: -1 })
      .lean();

    // Calculate summary
    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Format orders for response
    const ordersList = orders.map((order) => ({
      id: order.orderCode || order._id.toString(),
      customer: {
        name: order.customerId?.name || '',
        email: order.customerId?.email || '',
      },
      date: order.orderDate || order.createdAt,
      status: order.status,
      total: order.total,
      items: order.items || [],
    }));

    return {
      summary: {
        totalSales,
        totalOrders,
        averageOrderValue,
      },
      orders: ordersList,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get inventory report
 */
export const getInventoryReport = async () => {
  try {
    const products = await Product.find().lean();

    // Calculate stats
    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stock === 'in_stock').length;
    const lowStock = products.filter((p) => p.stock === 'low_stock').length;
    const outOfStock = products.filter((p) => p.stock === 'out_of_stock').length;
    const totalValue = products.reduce(
      (sum, p) => sum + (p.price * (p.stockQuantity || 0)),
      0
    );

    // Get low stock products
    const lowStockProducts = products.filter(
      (p) => p.stock === 'low_stock' || p.stock === 'out_of_stock'
    );

    // Format products
    const formatProduct = (product) => ({
      id: product._id.toString(),
      name: product.name,
      image: product.image || '',
      stockQuantity: product.stockQuantity || 0,
      stock: product.stock,
      price: product.price,
      value: product.price * (product.stockQuantity || 0),
    });

    return {
      stats: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        totalValue,
      },
      lowStockProducts: lowStockProducts.map(formatProduct),
      products: products.map(formatProduct),
    };
  } catch (error) {
    throw error;
  }
};

