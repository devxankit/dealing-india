import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';

/**
 * Get public products with filtering and pagination
 */
export const getPublicProducts = async (filters) => {
    const {
        search,
        categoryId,
        subcategoryId,
        brandId,
        minPrice,
        maxPrice,
        vendorId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = filters;

    const query = { isActive: true };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    if (brandId) query.brandId = brandId;
    if (vendorId) query.vendorId = vendorId;

    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const products = await Product.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName storeName');

    const total = await Product.countDocuments(query);

    return {
        products,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
    };
};

/**
 * Get single product by ID
 */
export const getPublicProductById = async (id) => {
    const product = await Product.findById(id)
        .populate('categoryId', 'name')
        .populate('brandId', 'name')
        .populate('vendorId', 'businessName storeName description logo');

    if (!product) throw new Error('Product not found');
    return product;
};

/**
 * Get search suggestions
 */
export const getB2BSearchSuggestions = async (query) => {
    if (!query) return [];
    const products = await Product.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
    }).limit(5).select('name');

    return products.map(p => p.name);
};
