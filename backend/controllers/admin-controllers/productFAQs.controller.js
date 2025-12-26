import {
  getAllFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../../services/productFAQs.service.js';

/**
 * Get all FAQs
 * GET /api/admin/product-faqs
 */
export const getFAQs = async (req, res, next) => {
  try {
    const filters = {
      productId: req.query.productId || 'all',
      status: req.query.status || 'all',
      page: req.query.page || 1,
      limit: req.query.limit || 100,
      sortBy: req.query.sortBy || 'order',
      sortOrder: req.query.sortOrder || 'asc',
    };

    const result = await getAllFAQs(filters);
    res.status(200).json({
      success: true,
      message: 'FAQs fetched successfully',
      data: result.faqs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get FAQ by ID
 * GET /api/admin/product-faqs/:id
 */
export const getFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await getFAQById(id);
    res.status(200).json({
      success: true,
      message: 'FAQ fetched successfully',
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create FAQ
 * POST /api/admin/product-faqs
 */
export const create = async (req, res, next) => {
  try {
    const faq = await createFAQ(req.body);
    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update FAQ
 * PUT /api/admin/product-faqs/:id
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await updateFAQ(id, req.body);
    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete FAQ
 * DELETE /api/admin/product-faqs/:id
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteFAQ(id);
    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

