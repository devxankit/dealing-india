import express from 'express';
import {
    addProperty,
    updateProperty,
    deleteProperty,
    listProperties,
    getPropertyById,
    getAllProperties
} from '../controllers/property.controller.js';
import { authenticate, vendorOnly } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

const router = express.Router();

// Vendor routes
router.post('/add', authenticate, vendorOnly, asyncHandler(addProperty));
router.put('/update/:id', authenticate, vendorOnly, asyncHandler(updateProperty));
router.delete('/delete/:id', authenticate, vendorOnly, asyncHandler(deleteProperty));
router.get('/list', authenticate, vendorOnly, asyncHandler(listProperties));
router.get('/details/:id', authenticate, vendorOnly, asyncHandler(getPropertyById));

// Public route
router.get('/all', asyncHandler(getAllProperties));

export default router;
