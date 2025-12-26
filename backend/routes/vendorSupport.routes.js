import express from 'express';
import {
  getVendorTicketsController,
  getVendorTicketController,
  createVendorTicketController,
  sendTicketMessageController,
  updateTicketStatusController,
} from '../controllers/vendor-controllers/vendorSupport.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { vendorApproved } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// All routes require vendor authentication and approval
router.use(authenticate);
router.use(vendorApproved);

// Vendor Support Ticket Routes
router.get('/tickets', asyncHandler(getVendorTicketsController));
router.get('/tickets/:id', asyncHandler(getVendorTicketController));
router.post('/tickets', asyncHandler(createVendorTicketController));
router.post('/tickets/:id/messages', asyncHandler(sendTicketMessageController));
router.put('/tickets/:id/status', asyncHandler(updateTicketStatusController));

export default router;

