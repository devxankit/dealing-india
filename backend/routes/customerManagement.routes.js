import express from 'express';
import {
  getCustomers,
  getCustomer,
  updateCustomerProfile,
  updateCustomerStatus,
  getAddresses,
  getAllCustomerAddresses,
  deleteAddress,
  getOrders,
  getTransactions,
  getAllCustomerTransactions,
  getCustomerAnalytics,
} from '../controllers/admin-controllers/customerManagement.controller.js';
import { getCustomerRegistrationAnalytics } from '../controllers/admin-controllers/customerRegistrationAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Customer management routes
router.get('/', asyncHandler(getCustomers));
router.get('/addresses', asyncHandler(getAllCustomerAddresses));
router.get('/transactions', asyncHandler(getAllCustomerTransactions));
router.get('/analytics/registration', asyncHandler(getCustomerRegistrationAnalytics));
router.get('/analytics', asyncHandler(getCustomerAnalytics));
router.get('/analytics/:id', asyncHandler(getCustomerAnalytics));
router.get('/:id', asyncHandler(getCustomer));
router.patch('/:id', asyncHandler(updateCustomerProfile));
router.patch('/:id/status', asyncHandler(updateCustomerStatus));
router.get('/:id/addresses', asyncHandler(getAddresses));
router.delete('/:id/addresses/:addrId', asyncHandler(deleteAddress));
router.get('/:id/orders', asyncHandler(getOrders));
router.get('/:id/transactions', asyncHandler(getTransactions));

export default router;

