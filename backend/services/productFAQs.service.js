import ProductFAQ from '../models/ProductFAQ.model.js';
import Product from '../models/Product.model.js';

/**
 * Get all FAQs with filters
 * @param {Object} filters - { productId, status, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { faqs, total, page, totalPages }
 */
export const getAllFAQs = async (filters = {}) => {
  try {
    const {
      productId,
      status,
      page = 1,
      limit = 100,
      sortBy = 'order',
      sortOrder = 'asc',
    } = filters;

    // Build query
    const query = {};

    // Product filter
    if (productId && productId !== 'all') {
      query.productId = productId;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [faqs, total] = await Promise.all([
      ProductFAQ.find(query)
        .populate('productId', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ProductFAQ.countDocuments(query),
    ]);

    // Transform FAQs to match frontend expectations
    const transformedFAQs = faqs.map((faq) => ({
      ...faq,
      id: faq._id,
      productName: faq.productId?.name || 'Unknown Product',
      productId: faq.productId?._id || faq.productId,
      question: faq.question,
      answer: faq.answer,
      order: faq.order || 0,
      status: faq.status,
    }));

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      faqs: transformedFAQs,
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
 * Get FAQ by ID
 * @param {String} faqId - FAQ ID
 * @returns {Promise<Object>} FAQ object
 */
export const getFAQById = async (faqId) => {
  try {
    const faq = await ProductFAQ.findById(faqId)
      .populate('productId', 'name')
      .lean();

    if (!faq) {
      throw new Error('FAQ not found');
    }

    return {
      ...faq,
      id: faq._id,
      productName: faq.productId?.name || 'Unknown Product',
      productId: faq.productId?._id || faq.productId,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid FAQ ID');
    }
    throw error;
  }
};



