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

/**
 * Create a new FAQ
 * @param {Object} faqData - { productId, question, answer, order, status }
 * @returns {Promise<Object>} Created FAQ
 */
export const createFAQ = async (faqData) => {
  try {
    const { productId, question, answer, order, status } = faqData;

    if (!productId) {
      throw new Error('Product ID is required');
    }
    if (!question || !question.trim()) {
      throw new Error('Question is required');
    }
    if (!answer || !answer.trim()) {
      throw new Error('Answer is required');
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const faq = await ProductFAQ.create({
      productId,
      question: question.trim(),
      answer: answer.trim(),
      order: order ? parseInt(order) : 0,
      status: status || 'active',
    });

    return faq.toObject();
  } catch (error) {
    throw error;
  }
};

/**
 * Update FAQ
 * @param {String} faqId - FAQ ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated FAQ
 */
export const updateFAQ = async (faqId, updateData) => {
  try {
    const { productId, question, answer, order, status } = updateData;

    const updateObj = {};
    if (productId !== undefined) {
      // Validate product exists if being updated
      if (productId) {
        const product = await Product.findById(productId);
        if (!product) {
          throw new Error('Product not found');
        }
      }
      updateObj.productId = productId;
    }
    if (question !== undefined) updateObj.question = question.trim();
    if (answer !== undefined) updateObj.answer = answer.trim();
    if (order !== undefined) updateObj.order = parseInt(order);
    if (status !== undefined) updateObj.status = status;

    const faq = await ProductFAQ.findByIdAndUpdate(
      faqId,
      updateObj,
      { new: true, runValidators: true }
    )
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

/**
 * Delete FAQ
 * @param {String} faqId - FAQ ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteFAQ = async (faqId) => {
  try {
    const faq = await ProductFAQ.findByIdAndDelete(faqId);
    if (!faq) {
      throw new Error('FAQ not found');
    }
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new Error('Invalid FAQ ID');
    }
    throw error;
  }
};

