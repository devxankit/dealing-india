import {
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  toggleCustomerStatus,
  getCustomerAddresses,
  getAllAddresses,
  deleteCustomerAddress,
  getCustomerOrders,
  getCustomerTransactions,
  getAllTransactions,
} from '../../services/customerManagement.service.js';

/**
 * Get all customers with filters
 * GET /api/admin/customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await getAllCustomers({
      search,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID
 * GET /api/admin/customers/:id
 */
export const getCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);

    res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer
 * PATCH /api/admin/customers/:id
 */
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const customer = await updateCustomer(id, { name, email, phone });

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle customer status
 * PATCH /api/admin/customers/:id/status
 */
export const updateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await toggleCustomerStatus(id);

    res.status(200).json({
      success: true,
      message: `Customer status updated to ${customer.status}`,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer addresses
 * GET /api/admin/customers/:id/addresses
 */
export const getAddresses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addresses = await getCustomerAddresses(id);

    res.status(200).json({
      success: true,
      message: 'Customer addresses retrieved successfully',
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all addresses (for admin addresses page)
 * GET /api/admin/customers/addresses
 */
export const getAllCustomerAddresses = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const addresses = await getAllAddresses({ search });

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: { addresses },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer orders
 * GET /api/admin/customers/:id/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orders = await getCustomerOrders(id);

    res.status(200).json({
      success: true,
      message: 'Customer orders retrieved successfully',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer transactions
 * GET /api/admin/customers/:id/transactions
 */
export const getTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transactions = await getCustomerTransactions(id);

    res.status(200).json({
      success: true,
      message: 'Customer transactions retrieved successfully',
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions (for admin transactions page)
 * GET /api/admin/customers/transactions
 */
export const getAllCustomerTransactions = async (req, res, next) => {
  try {
    const { search = '', status = 'all' } = req.query;
    const transactions = await getAllTransactions({ search, status });

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete customer address
 * DELETE /api/admin/customers/:id/addresses/:addrId
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { id, addrId } = req.params;
    await deleteCustomerAddress(id, addrId);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

