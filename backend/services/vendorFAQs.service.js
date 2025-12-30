import ProductFAQ from '../models/ProductFAQ.model.js';
import Product from '../models/Product.model.js';
import mongoose from 'mongoose';

/**
 * Get all FAQs for vendor's products
 * @param {String} vendorId - Vendor ID
 * @param {Object} filters - { productId, status, page, limit, sortBy, sortOrder }
 * @returns {Promise<Object>} { faqs, total, page, totalPages }
 */
export const getVendorFAQs = async (vendorId, filters = {}) => {
  try {
    const {
      productId,
      status,
      page = 1,
      limit = 100,
      sortBy = 'order',
      sortOrder = 'asc',
    } = filters;

    // Build query - ensure FAQ belongs to vendor's products
    const productQuery = { vendorId };
    if (productId && productId !== 'all') {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        const err = new Error('Invalid product ID format');
        err.status = 400;
        throw err;
      }
      productQuery._id = productId;
    }

    // Get vendor's product IDs
    const vendorProducts = await Product.find(productQuery).select('_id').lean();
    const productIds = vendorProducts.map((p) => p._id);

    if (productIds.length === 0) {
      return {
        faqs: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
      };
    }

    // Build FAQ query
    const faqQuery = { productId: { $in: productIds } };
    if (status && status !== 'all') {
      faqQuery.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [faqs, total] = await Promise.all([
      ProductFAQ.find(faqQuery)
        .populate('productId', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ProductFAQ.countDocuments(faqQuery),
    ]);

    // Transform FAQs to match frontend expectations
    const transformedFAQs = faqs.map((faq) => ({
      ...faq,
      id: faq._id.toString(),
      _id: faq._id.toString(),
      productName: faq.productId?.name || 'Unknown Product',
      productId: faq.productId?._id?.toString() || faq.productId?.toString() || faq.productId,
      question: faq.question,
      answer: faq.answer,
      order: faq.order || 0,
      status: faq.status,
      isActive: faq.status === 'active',
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
 * Get FAQ by ID (vendor-owned only)
 * @param {String} vendorId - Vendor ID
 * @param {String} faqId - FAQ ID
 * @returns {Promise<Object>} FAQ object
 */
export const getVendorFAQById = async (vendorId, faqId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      const err = new Error('Invalid FAQ ID format');
      err.status = 400;
      throw err;
    }

    const faq = await ProductFAQ.findById(faqId)
      .populate('productId', 'name vendorId')
      .lean();

    if (!faq) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    // Verify FAQ belongs to vendor's product
    if (faq.productId?.vendorId?.toString() !== vendorId.toString()) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    return {
      ...faq,
      id: faq._id.toString(),
      _id: faq._id.toString(),
      productName: faq.productId?.name || 'Unknown Product',
      productId: faq.productId?._id?.toString() || faq.productId?.toString() || faq.productId,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid FAQ ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

/**
 * Create a new FAQ for vendor's product
 * @param {String} vendorId - Vendor ID
 * @param {Object} faqData - { productId, question, answer, order, status }
 * @returns {Promise<Object>} Created FAQ
 */
export const createVendorFAQ = async (vendorId, faqData) => {
  try {
    const { productId, question, answer, order, status } = faqData;

    if (!productId) {
      const err = new Error('Product ID is required');
      err.status = 400;
      throw err;
    }
    if (!question || !question.trim()) {
      const err = new Error('Question is required');
      err.status = 400;
      throw err;
    }
    if (!answer || !answer.trim()) {
      const err = new Error('Answer is required');
      err.status = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('Invalid product ID format');
      err.status = 400;
      throw err;
    }

    // Validate product exists and belongs to vendor
    const product = await Product.findOne({ _id: productId, vendorId });
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const faq = await ProductFAQ.create({
      productId,
      vendorId,
      question: question.trim(),
      answer: answer.trim(),
      order: order ? parseInt(order) : 0,
      status: status || 'active',
    });

    const populatedFaq = await ProductFAQ.findById(faq._id)
      .populate('productId', 'name')
      .lean();

    return {
      ...populatedFaq,
      id: populatedFaq._id.toString(),
      _id: populatedFaq._id.toString(),
      productName: populatedFaq.productId?.name || 'Unknown Product',
      productId: populatedFaq.productId?._id?.toString() || populatedFaq.productId?.toString() || populatedFaq.productId,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update FAQ (vendor-owned only)
 * @param {String} vendorId - Vendor ID
 * @param {String} faqId - FAQ ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated FAQ
 */
export const updateVendorFAQ = async (vendorId, faqId, updateData) => {
  try {
    const { productId, question, answer, order, status } = updateData;

    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      const err = new Error('Invalid FAQ ID format');
      err.status = 400;
      throw err;
    }

    // First verify FAQ belongs to vendor
    const existingFaq = await ProductFAQ.findById(faqId)
      .populate('productId', 'vendorId')
      .lean();

    if (!existingFaq) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    if (existingFaq.productId?.vendorId?.toString() !== vendorId.toString()) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    const updateObj = {};
    if (productId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        const err = new Error('Invalid product ID format');
        err.status = 400;
        throw err;
      }
      // Validate product exists and belongs to vendor
      const product = await Product.findOne({ _id: productId, vendorId });
      if (!product) {
        const err = new Error('Product not found');
        err.status = 404;
        throw err;
      }
      updateObj.productId = productId;
    }
    if (question !== undefined) updateObj.question = question.trim();
    if (answer !== undefined) updateObj.answer = answer.trim();
    if (order !== undefined) updateObj.order = parseInt(order);
    if (status !== undefined) updateObj.status = status;

    const faq = await ProductFAQ.findByIdAndUpdate(faqId, updateObj, {
      new: true,
      runValidators: true,
    })
      .populate('productId', 'name')
      .lean();

    return {
      ...faq,
      id: faq._id.toString(),
      _id: faq._id.toString(),
      productName: faq.productId?.name || 'Unknown Product',
      productId: faq.productId?._id?.toString() || faq.productId?.toString() || faq.productId,
    };
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid FAQ ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

/**
 * Delete FAQ (vendor-owned only)
 * @param {String} vendorId - Vendor ID
 * @param {String} faqId - FAQ ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteVendorFAQ = async (vendorId, faqId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      const err = new Error('Invalid FAQ ID format');
      err.status = 400;
      throw err;
    }

    // Verify FAQ belongs to vendor
    const faq = await ProductFAQ.findById(faqId)
      .populate('productId', 'vendorId')
      .lean();

    if (!faq) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    if (faq.productId?.vendorId?.toString() !== vendorId.toString()) {
      const err = new Error('FAQ not found');
      err.status = 404;
      throw err;
    }

    await ProductFAQ.findByIdAndDelete(faqId);
    return true;
  } catch (error) {
    if (error.name === 'CastError') {
      const err = new Error('Invalid FAQ ID');
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

