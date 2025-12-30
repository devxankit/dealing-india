import express from 'express';
import {
  getFAQs,
  getFAQ,
  create,
  update,
  remove,
} from '../controllers/vendor-controllers/vendorFAQs.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// All routes require vendor authentication
router.use(authenticate);
router.use(authorize('vendor'));

// Validation rules
const faqValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID format'),
  body('question')
    .notEmpty()
    .trim()
    .withMessage('Question is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Question must be between 5 and 500 characters'),
  body('answer')
    .notEmpty()
    .trim()
    .withMessage('Answer is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
];

// Routes
router.get(
  '/',
  [
    query('productId').optional().isMongoId().withMessage('Invalid product ID format'),
    query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isIn(['order', 'createdAt', 'updatedAt']).withMessage('Invalid sortBy'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sortOrder'),
  ],
  asyncHandler(getFAQs)
);

router.get(
  '/:id',
  asyncHandler(getFAQ)
);

router.post('/', faqValidation, asyncHandler(create));

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid FAQ ID format'),
    ...faqValidation.map((rule) => rule.optional()),
  ],
  asyncHandler(update)
);

router.delete(
  '/:id',
  asyncHandler(remove)
);

export default router;

