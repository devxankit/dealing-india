import Product from '../models/Product.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BCategory from '../models/B2BCategory.model.js';

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
        vendorType,
        state,
        city,
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

    if (state || city) {
        // Find vendors in these locations first
        const vendorQuery = { isActive: true };
        if (state) vendorQuery['address.state'] = state;
        if (city) vendorQuery['address.city'] = city;

        const matchingVendors = await Vendor.find(vendorQuery).select('_id');
        const vendorIds = matchingVendors.map(v => v._id);

        if (query.vendorId) {
            // Intersection if vendorId was already specified
            if (Array.isArray(query.vendorId.$in)) {
                query.vendorId.$in = query.vendorId.$in.filter(id => vendorIds.includes(id.toString()));
            } else {
                const currentVendorId = query.vendorId.toString();
                if (!vendorIds.some(id => id.toString() === currentVendorId)) {
                    // No overlap, search results will be empty
                    query.vendorId = { $in: [] };
                }
            }
        } else {
            query.vendorId = { $in: vendorIds };
        }
    }

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
        .populate('vendorId', 'name storeName address phone');

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
        .populate('vendorId', 'name storeName description logo phone address');

    if (!product) throw new Error('Product not found');
    return product;
};

/**
 * Get search suggestions
 */
export const getB2BSearchSuggestions = async (query) => {
    if (!query || query.trim().length < 1) return [];

    const suggestions = [];

    // 1. Search products
    const products = await Product.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
    }).limit(5).select('name image');

    products.forEach(p => {
        suggestions.push({
            text: p.name,
            context: 'In Products',
            type: 'product',
            image: p.image || null
        });
    });

    // 2. Search Categories
    const categories = await B2BCategory.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
    }).limit(3).select('name image');

    categories.forEach(c => {
        suggestions.push({
            text: c.name,
            context: 'In Categories',
            type: 'category',
            image: c.image || null
        });
    });

    // 3. Search Subcategories (stored as array of strings in B2BCategory)
    const categoryWithMatchingSub = await B2BCategory.find({
        subcategories: { $regex: query, $options: 'i' },
        isActive: true
    }).limit(3);

    categoryWithMatchingSub.forEach(cat => {
        cat.subcategories.forEach(sub => {
            if (sub.toLowerCase().includes(query.toLowerCase()) && suggestions.length < 12) {
                // Avoid duplicates
                if (!suggestions.some(s => s.text === sub)) {
                    suggestions.push({
                        text: sub,
                        context: `In ${cat.name}`,
                        type: 'subcategory',
                        parentId: cat._id
                    });
                }
            }
        });
    });

    return suggestions;
};
