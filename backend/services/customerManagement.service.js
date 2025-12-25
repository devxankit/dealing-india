import User from '../models/User.model.js';
import Address from '../models/Address.model.js';
import Order from '../models/Order.model.js';
import Transaction from '../models/Transaction.model.js';

/**
 * Get all customers with filters
 */
export const getAllCustomers = async (filters = {}) => {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query = { role: 'user' };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    // Enrich with order stats
    const customers = await Promise.all(
      users.map(async (user) => {
        const orders = await Order.find({ customerId: user._id }).lean();
        const totalSpent = orders
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.total || 0), 0);
        const lastOrder = orders
          .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          status: user.isActive ? 'active' : 'blocked',
          orders: orders.length,
          totalSpent,
          lastOrderDate: lastOrder?.orderDate || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      customers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId) => {
  try {
    const user = await User.findById(customerId).select('-password').lean();
    if (!user || user.role !== 'user') {
      throw new Error('Customer not found');
    }

    // Get orders
    const orders = await Order.find({ customerId: user._id })
      .sort({ orderDate: -1 })
      .lean();

    const totalSpent = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const lastOrder = orders[0];

    // Get addresses
    const addresses = await Address.find({ userId: user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    // Get activity history (simplified - can be enhanced)
    const activityHistory = [];

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      status: user.isActive ? 'active' : 'blocked',
      orders: orders.length,
      totalSpent,
      lastOrderDate: lastOrder?.orderDate || null,
      addresses: addresses.map((addr) => ({
        id: addr._id.toString(),
        name: addr.name,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.isDefault,
        type: addr.type,
      })),
      activityHistory,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    throw error;
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (customerId, updateData) => {
  try {
    const { name, email, phone } = updateData;

    const updateObj = {};
    if (name !== undefined) updateObj.name = name.trim();
    if (email !== undefined) updateObj.email = email.toLowerCase().trim();
    if (phone !== undefined) updateObj.phone = phone || null;

    const user = await User.findByIdAndUpdate(
      customerId,
      updateObj,
      { new: true, runValidators: true }
    )
      .select('-password')
      .lean();

    if (!user || user.role !== 'user') {
      throw new Error('Customer not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      status: user.isActive ? 'active' : 'blocked',
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    if (error.code === 11000) {
      throw new Error('Email or phone already exists');
    }
    throw error;
  }
};

/**
 * Toggle customer status
 */
export const toggleCustomerStatus = async (customerId) => {
  try {
    const user = await User.findById(customerId);
    if (!user || user.role !== 'user') {
      throw new Error('Customer not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      id: user._id.toString(),
      status: user.isActive ? 'active' : 'blocked',
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    throw error;
  }
};

/**
 * Get customer addresses
 */
export const getCustomerAddresses = async (customerId) => {
  try {
    const addresses = await Address.find({ userId: customerId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return addresses.map((addr) => ({
      id: addr._id.toString(),
      customerId: addr.userId.toString(),
      customerName: '', // Will be populated if needed
      customerEmail: '', // Will be populated if needed
      name: addr.name,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      phone: addr.phone,
      isDefault: addr.isDefault,
      type: addr.type,
    }));
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    throw error;
  }
};

/**
 * Get all addresses (for admin addresses page)
 */
export const getAllAddresses = async (filters = {}) => {
  try {
    const { search = '' } = filters;

    let query = {};
    if (search) {
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const addresses = await Address.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return addresses.map((addr) => ({
      id: addr._id.toString(),
      customerId: addr.userId._id.toString(),
      customerName: addr.userId.name,
      customerEmail: addr.userId.email,
      name: addr.name,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      phone: addr.phone,
      isDefault: addr.isDefault,
      type: addr.type,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Delete customer address
 */
export const deleteCustomerAddress = async (customerId, addressId) => {
  try {
    const address = await Address.findOne({
      _id: addressId,
      userId: customerId,
    });

    if (!address) {
      throw new Error('Address not found');
    }

    await Address.findByIdAndDelete(addressId);
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid address ID');
    }
    throw error;
  }
};

/**
 * Get customer orders
 */
export const getCustomerOrders = async (customerId) => {
  try {
    const orders = await Order.find({ customerId })
      .populate('customerId', 'name email')
      .sort({ orderDate: -1 })
      .lean();

    return orders.map((order) => ({
      id: order.orderCode || order._id.toString(),
      customer: {
        name: order.customerId?.name || '',
        email: order.customerId?.email || '',
      },
      date: order.orderDate || order.createdAt,
      status: order.status,
      total: order.total,
      items: order.items || [],
      paymentMethod: order.paymentMethod,
    }));
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    throw error;
  }
};

/**
 * Get customer transactions
 */
export const getCustomerTransactions = async (customerId) => {
  try {
    const orders = await Order.find({ customerId }).lean();

    const transactions = [];
    for (const order of orders) {
      // Payment transaction
      transactions.push({
        id: `TXN-${order.orderCode || order._id}-1`,
        orderId: order.orderCode || order._id.toString(),
        amount: order.total,
        type: 'payment',
        status: order.status === 'cancelled' ? 'failed' : 'completed',
        method: order.paymentMethod || 'Credit Card',
        date: order.orderDate || order.createdAt,
      });

      // Refund transaction if cancelled
      if (order.status === 'cancelled') {
        transactions.push({
          id: `TXN-${order.orderCode || order._id}-2`,
          orderId: order.orderCode || order._id.toString(),
          amount: order.total,
          type: 'refund',
          status: 'completed',
          method: 'Original Payment Method',
          date: new Date(
            new Date(order.orderDate || order.createdAt).getTime() + 86400000
          ).toISOString(),
        });
      }
    }

    return transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid customer ID');
    }
    throw error;
  }
};

/**
 * Get all transactions (for admin transactions page)
 */
export const getAllTransactions = async (filters = {}) => {
  try {
    const { search = '', status: statusFilter = 'all' } = filters;

    const orders = await Order.find()
      .populate('customerId', 'name email')
      .sort({ orderDate: -1 })
      .lean();

    const transactions = [];
    for (const order of orders) {
      const customer = order.customerId || {};

      // Payment transaction
      const paymentTxn = {
        id: `TXN-${order.orderCode || order._id}-1`,
        orderId: order.orderCode || order._id.toString(),
        customerName: customer.name || '',
        customerEmail: customer.email || '',
        amount: order.total,
        type: 'payment',
        status: order.status === 'cancelled' ? 'failed' : 'completed',
        method: order.paymentMethod || 'Credit Card',
        date: order.orderDate || order.createdAt,
      };

      // Apply filters
      const matchesSearch =
        !search ||
        paymentTxn.orderId.toLowerCase().includes(search.toLowerCase()) ||
        paymentTxn.customerName.toLowerCase().includes(search.toLowerCase()) ||
        paymentTxn.customerEmail.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || paymentTxn.status === statusFilter;

      if (matchesSearch && matchesStatus) {
        transactions.push(paymentTxn);
      }

      // Refund transaction if cancelled
      if (order.status === 'cancelled') {
        const refundTxn = {
          id: `TXN-${order.orderCode || order._id}-2`,
          orderId: order.orderCode || order._id.toString(),
          customerName: customer.name || '',
          customerEmail: customer.email || '',
          amount: order.total,
          type: 'refund',
          status: 'completed',
          method: 'Original Payment Method',
          date: new Date(
            new Date(order.orderDate || order.createdAt).getTime() + 86400000
          ).toISOString(),
        };

        const refundMatchesSearch =
          !search ||
          refundTxn.orderId.toLowerCase().includes(search.toLowerCase()) ||
          refundTxn.customerName.toLowerCase().includes(search.toLowerCase()) ||
          refundTxn.customerEmail.toLowerCase().includes(search.toLowerCase());

        const refundMatchesStatus =
          statusFilter === 'all' || refundTxn.status === statusFilter;

        if (refundMatchesSearch && refundMatchesStatus) {
          transactions.push(refundTxn);
        }
      }
    }

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    throw error;
  }
};

