import {
  getVendorFAQs,
  getVendorFAQById,
  createVendorFAQ,
  updateVendorFAQ,
  deleteVendorFAQ,
} from '../../services/vendorFAQs.service.js';

/**
 * Get all FAQs for vendor's products
 * GET /api/vendor/faqs
 */
export const getFAQs = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const filters = {
      productId: req.query.productId || 'all',
      status: req.query.status || 'all',
      page: req.query.page || 1,
      limit: req.query.limit || 100,
      sortBy: req.query.sortBy || 'order',
      sortOrder: req.query.sortOrder || 'asc',
    };

    const result = await getVendorFAQs(vendorId, filters);
    res.status(200).json({
      success: true,
      message: 'FAQs fetched successfully',
      data: {
        faqs: result.faqs,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get FAQ by ID
 * GET /api/vendor/faqs/:id
 */
export const getFAQ = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const faq = await getVendorFAQById(vendorId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'FAQ fetched successfully',
      data: { faq },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new FAQ
 * POST /api/vendor/faqs
 */
export const create = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const faq = await createVendorFAQ(vendorId, req.body);
    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: { faq },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update FAQ
 * PUT /api/vendor/faqs/:id
 */
export const update = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    const faq = await updateVendorFAQ(vendorId, req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: { faq },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete FAQ
 * DELETE /api/vendor/faqs/:id
 */
export const remove = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor ID not found',
      });
    }

    await deleteVendorFAQ(vendorId, req.params.id);
    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

