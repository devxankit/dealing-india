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
import { checkPropertyCreation } from '../middleware/subscriptionRestriction.middleware.js';

const router = express.Router();

// Vendor routes
// Property creation requires Premium plan, middleware also attaches max image limit
router.post('/add', authenticate, vendorOnly, checkPropertyCreation, asyncHandler(addProperty));
// Property update also checks subscription for image limits
router.put('/update/:id', authenticate, vendorOnly, checkPropertyCreation, asyncHandler(updateProperty));
router.delete('/delete/:id', authenticate, vendorOnly, asyncHandler(deleteProperty));
router.get('/list', authenticate, vendorOnly, asyncHandler(listProperties));
router.get('/details/:id', authenticate, vendorOnly, asyncHandler(getPropertyById));

// Public route
router.get('/all', asyncHandler(getAllProperties));

export default router;
