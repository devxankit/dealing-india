import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BCategory from '../models/B2BCategory.model.js';

/**
 * Get public products with filtering and pagination
 */
export const getPublicProducts = async (filters) => {
    const {
        search, description, // description added to destructuring just in case
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
        sortOrder = 'desc',
        itemType,
        area,
        market,
        businessType,
        businessSubType,
        dynamicFilters
    } = filters;

    // --- Helper to build match query ---
    const buildMatchQuery = async (isLotSlot = false) => {
        const query = { isActive: true };

        // Search Filter
        if (search) {
            const regex = { $regex: search, $options: 'i' };
            const orConditions = [
                { name: regex },
                { description: regex },
                { category: regex },
                { subcategory: regex }
            ];

            if (!isLotSlot) {
                // Products have items, LotSlots don't
                orConditions.push({ 'items.itemName': regex });
            }

            query.$or = orConditions;
        }

        // Category
        if (categoryId) {
            try {
                // Try to resolve category ID to name, or use as string
                const cat = await B2BCategory.findById(categoryId);
                const catName = cat ? cat.name : categoryId;
                query.category = { $regex: new RegExp(`^${catName}$`, 'i') };
            } catch (e) {
                query.category = { $regex: new RegExp(`^${categoryId}$`, 'i') };
            }
        }

        // Subcategory
        if (subcategoryId) {
            query.subcategory = { $regex: new RegExp(`^${subcategoryId}$`, 'i') };
        }

        // Brand
        if (brandId) {
            if (isLotSlot) query.brand = brandId; // LotSlot uses 'brand'
            else query.brandName = brandId; // Product uses 'brandName'
        }

        // Price
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Dynamic Filters (Attributes)
        if (dynamicFilters) {
            try {
                const parsedFilters = typeof dynamicFilters === 'string' ? JSON.parse(dynamicFilters) : dynamicFilters;
                const filterEntries = Object.entries(parsedFilters);

                if (filterEntries.length > 0) {
                    const dynamicQueryParts = filterEntries.map(([attrName, value]) => {
                        const matchQuery = { name: attrName };
                        if (Array.isArray(value)) {
                            matchQuery.value = { $in: value };
                        } else {
                            matchQuery.value = value;
                        }
                        // LotSlots uses specifications array, Product uses attributes array
                        // Both have similar structure { name, value } but different field names in schema?
                        // Product: attributes[{ attributeName, name, value }]
                        // LotSlot: specifications[{ name, value }]
                        const fieldName = isLotSlot ? 'specifications' : 'attributes';
                        return { [fieldName]: { $elemMatch: matchQuery } };
                    });

                    if (query.$and) {
                        query.$and.push(...dynamicQueryParts);
                    } else {
                        query.$and = dynamicQueryParts;
                    }
                }
            } catch (e) {
                console.error('Error parsing dynamicFilters:', e);
            }
        }

        return query;
    };

    // --- Resolve Vendor IDs from Location Filters ---
    let locationVendorIds = null;
    if (state || city || area || market || businessType || businessSubType) {
        const vendorQuery = { isActive: true };
        if (state) vendorQuery['address.state'] = state;
        if (city) vendorQuery['address.city'] = city;
        if (area) vendorQuery['address.area'] = area;
        if (market) vendorQuery['address.market'] = { $regex: new RegExp(`^${market}$`, 'i') };
        if (businessType) vendorQuery.businessType = { $regex: new RegExp(`^${businessType}$`, 'i') };
        if (businessSubType) vendorQuery.selectedSubTypes = { $in: [new RegExp(`^${businessSubType}$`, 'i')] };

        const matchingVendors = await Vendor.find(vendorQuery).select('_id').lean();
        locationVendorIds = matchingVendors.map(v => v._id);
    }

    // --- Combine Vendor Filter ---
    const applyVendorFilter = (query) => {
        if (vendorId) {
            if (locationVendorIds) {
                // Intersection
                if (locationVendorIds.some(id => id.toString() === vendorId.toString())) {
                    query.vendorId = new mongoose.Types.ObjectId(vendorId);
                } else {
                    // Intersection empty -> no results
                    query.vendorId = new mongoose.Types.ObjectId('000000000000000000000000'); // Valid but non-existent ObjectId
                }
            } else {
                query.vendorId = new mongoose.Types.ObjectId(vendorId);
            }
        } else if (locationVendorIds) {
            query.vendorId = { $in: locationVendorIds };
        }
        return query;
    };

    // --- Build Queries ---
    let productQuery = await buildMatchQuery(false);
    productQuery = applyVendorFilter(productQuery);

    let lotSlotQuery = await buildMatchQuery(true);
    lotSlotQuery = applyVendorFilter(lotSlotQuery);

    // --- Aggregation Pipeline ---
    const pipeline = [];

    // 1. Tag and Match
    // If itemType is specific, we only query that collection
    // If 'all', we union

    if (itemType === 'product' || !itemType || itemType === 'all') {
        pipeline.push({ $match: productQuery });
        pipeline.push({ $addFields: { itemType: 'product' } });
    } else {
        // If sorting strictly by 'lotslot', start empty or minimal?
        // Actually if itemType IS lotslot, we don't start with Product.
        // We can just query LotSlot directly.
        // But to keep pipeline uniform:
        pipeline.push({ $match: { _id: null } }); // Match nothing in Product
    }

    // 2. Union with LotSlot
    if (itemType === 'lotslot' || !itemType || itemType === 'all') {
        pipeline.push({
            $unionWith: {
                coll: 'lotslots',
                pipeline: [
                    { $match: lotSlotQuery },
                    { $addFields: { itemType: 'lotslot', brandName: '$brand' } } // Map brand -> brandName
                ]
            }
        });
    }

    // 3. Sort
    const sortField = sortBy === 'createdAt' ? 'createdAt' : sortBy; // Simple mapping
    const sortDir = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: { [sortField]: sortDir } });

    // 4. Facet for Total Count & Paginated Data
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) },
                // Populate Vendor
                {
                    $lookup: {
                        from: 'vendors',
                        localField: 'vendorId',
                        foreignField: '_id',
                        pipeline: [{ $project: { name: 1, storeName: 1, address: 1, phone: 1, logo: 1 } }],
                        as: 'vendor'
                    }
                },
                { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
                // Populate ShopUnit (if needed, mostly for Product)
                {
                    $lookup: {
                        from: 'shopunits',
                        localField: 'shopUnitId',
                        foreignField: '_id',
                        as: 'shopUnit'
                    }
                },
                { $unwind: { path: '$shopUnit', preserveNullAndEmptyArrays: true } }
            ]
        }
    });

    // Execute
    const result = await Product.aggregate(pipeline);

    const metadata = result[0].metadata;
    const data = result[0].data;

    const total = metadata.length > 0 ? metadata[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Ensure numeric values are numbers (aggregation sometimes leaves them as is, which is fine)
    // sanitize images if needed? The original code didn't seem to sanitize heavily here, just .lean()

    return {
        products: data,
        total,
        page: parseInt(page),
        pages: totalPages
    };
};

/**
 * Get single product by ID
 */
export const getPublicProductById = async (id) => {
    let item = await Product.findById(id)
        .populate('vendorId', 'name storeName description logo phone address')
        .populate('shopUnitId')
        .lean();

    let isLotSlot = false;
    if (!item) {
        item = await LotSlot.findById(id)
            .populate('vendorId', 'name storeName description logo phone address')
            .lean();
        isLotSlot = true;
    }

    if (!item) throw new Error('Product not found');

    // Tag it - with .lean(), item is already a plain object
    const taggedItem = { ...item, itemType: isLotSlot ? 'lotslot' : 'product' };

    return taggedItem;
};

/**
 * Get search suggestions
 */
export const getB2BSearchSuggestions = async (query) => {
    if (!query || query.trim().length < 1) return [];

    const suggestions = [];

    const [products, lotSlots, shopItems] = await Promise.all([
        Product.find({ name: { $regex: query, $options: 'i' }, isActive: true }).limit(5).select('name image'),
        LotSlot.find({ name: { $regex: query, $options: 'i' }, isActive: true }).limit(5).select('name image'),
        Product.find({ 'items.itemName': { $regex: query, $options: 'i' }, isActive: true }).limit(5).select('items name')
    ]);

    products.forEach(p => {
        suggestions.push({
            text: p.name,
            context: 'In Products',
            type: 'product',
            image: p.image || null
        });
    });

    lotSlots.forEach(l => {
        suggestions.push({
            text: l.name,
            context: 'In Lots/Slots',
            type: 'lotslot',
            image: l.image || (l.images && l.images[0]) || null
        });
    });

    // Search for Item Names inside shop listings
    shopItems.forEach(p => {
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
                if (item.itemName && item.itemName.toLowerCase().includes(query.toLowerCase()) && suggestions.length < 15) {
                    if (!suggestions.some(s => s.text === item.itemName)) {
                        suggestions.push({
                            text: item.itemName,
                            context: `In ${p.name}`,
                            type: 'product',
                            image: (item.images && item.images[0]) || null
                        });
                    }
                }
            });
        }
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

    // 3. Search Subcategories (stored as objects with {name, fields} in B2BCategory)
    const categoryWithMatchingSub = await B2BCategory.find({
        'subcategories.name': { $regex: query, $options: 'i' },
        isActive: true
    }).limit(3);

    categoryWithMatchingSub.forEach(cat => {
        cat.subcategories.forEach(subObj => {
            const subName = typeof subObj === 'string' ? subObj : subObj?.name;
            if (subName && subName.toLowerCase().includes(query.toLowerCase()) && suggestions.length < 12) {
                // Avoid duplicates
                if (!suggestions.some(s => s.text === subName)) {
                    suggestions.push({
                        text: subName,
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
