import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
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
        sortOrder = 'desc',
        itemType,
        pattern,
        fabric
    } = filters;

    const query = { isActive: true };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { subcategory: { $regex: search, $options: 'i' } }
        ];
    }

    // Category filtering - Product model uses string 'category' field, not ObjectId 'categoryId'
    if (categoryId) {
        try {
            const cat = await B2BCategory.findById(categoryId);
            if (cat) {
                query.category = { $regex: new RegExp(`^${cat.name}$`, 'i') };
            }
        } catch (e) {
            // If categoryId is actually a category name string, use it directly
            query.category = { $regex: new RegExp(`^${categoryId}$`, 'i') };
        }
    }
    // Subcategory filtering - Product model uses string 'subcategory' field
    if (subcategoryId) {
        query.subcategory = { $regex: new RegExp(`^${subcategoryId}$`, 'i') };
    }
    if (brandId) query.brandName = brandId;

    // Pattern and Fabric filtering for Products
    // Products store these in 'attributes' array: [{ name: 'Pattern', value: '...' }, ...]
    if (pattern) {
        query.attributes = {
            $elemMatch: {
                name: { $regex: new RegExp('^pattern$', 'i') },
                value: { $regex: new RegExp(`^${pattern}$`, 'i') }
            }
        };
    }
    if (fabric) {
        // use $and if attributes is already used
        const fabricQuery = {
            $elemMatch: {
                name: { $regex: new RegExp('^fabric$', 'i') },
                value: { $regex: new RegExp(`^${fabric}$`, 'i') }
            }
        };

        if (query.attributes) {
            query.$and = [
                { attributes: query.attributes },
                { attributes: fabricQuery }
            ];
            delete query.attributes;
        } else {
            query.attributes = fabricQuery;
        }
    }

    // Fix: query.vendorId handling for locations was slightly flawed if vendorId already exists.
    // Instead, let's just collect valid vendorIDs if location is filtered.
    let locationVendorIds = null;
    if (state || city) {
        const vendorQuery = { isActive: true };
        if (state) vendorQuery['address.state'] = state;
        if (city) vendorQuery['address.city'] = city;
        const matchingVendors = await Vendor.find(vendorQuery).select('_id').lean();
        locationVendorIds = matchingVendors.map(v => v._id);
    }

    if (vendorId) {
        // If specific vendor requested
        if (locationVendorIds) {
            // Intersection
            if (locationVendorIds.some(id => id.toString() === vendorId.toString())) {
                query.vendorId = vendorId;
            } else {
                // returns nothing
                query.vendorId = { $in: [] };
            }
        } else {
            query.vendorId = vendorId;
        }
    } else if (locationVendorIds) {
        query.vendorId = { $in: locationVendorIds };
    }

    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // --- FETCHING STRATEGY BASED ON itemType ---
    let products = [];
    let lotSlots = [];

    // 1. Fetch Products (if not restricted to lotslot)
    if (itemType !== 'lotslot') {
        products = await Product.find(query)
            .sort(sort)
            .populate('vendorId', 'name storeName address phone')
            .lean();
    }

    // 2. Fetch LotSlots (if not restricted to product)
    if (itemType !== 'product') {
        const lotSlotQuery = { isActive: true };

        // Map common filters to LotSlot schema
        if (search) {
            lotSlotQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Apply same vendorId logic
        if (query.vendorId) {
            lotSlotQuery.vendorId = query.vendorId;
        }

        if (minPrice || maxPrice) {
            lotSlotQuery.price = {};
            if (minPrice) lotSlotQuery.price.$gte = Number(minPrice);
            if (maxPrice) lotSlotQuery.price.$lte = Number(maxPrice);
        }

        // Handling category for LotSlot (it uses string name in model usually, verify if possible)
        // Assuming for now it uses string names as per previous code
        if (categoryId) {
            try {
                const cat = await B2BCategory.findById(categoryId);
                if (cat) lotSlotQuery.category = cat.name;
            } catch (e) {
                // ignore invalid id
            }
        }
        if (subcategoryId) {
            lotSlotQuery.subcategory = subcategoryId;
        }

        // LotSlot has direct fields for pattern and fabric
        // But also check specifications just in case
        if (pattern) {
            lotSlotQuery.$or = [
                { pattern: { $regex: new RegExp(`^${pattern}$`, 'i') } },
                { specifications: { $elemMatch: { name: { $regex: 'pattern', $options: 'i' }, value: { $regex: pattern, $options: 'i' } } } }
            ];
        }
        if (fabric) {
            const fabricCond = [
                { fabric: { $regex: new RegExp(`^${fabric}$`, 'i') } },
                { specifications: { $elemMatch: { name: { $regex: 'fabric', $options: 'i' }, value: { $regex: fabric, $options: 'i' } } } }
            ];

            if (lotSlotQuery.$or) {
                // intersection needed if pattern already added $or
                lotSlotQuery.$and = [
                    { $or: lotSlotQuery.$or },
                    { $or: fabricCond }
                ];
                delete lotSlotQuery.$or;
            } else {
                lotSlotQuery.$or = fabricCond;
            }
        }

        lotSlots = await LotSlot.find(lotSlotQuery)
            .sort(sort)
            .populate('vendorId', 'name storeName address phone')
            .lean();
    }

    // Tag them so frontend can distinguish
    // With .lean(), documents are already plain objects (no _doc needed)
    const taggedProducts = products.map(p => ({ ...p, itemType: 'product' }));
    const taggedLots = lotSlots.map(l => ({ ...l, itemType: 'lotslot' }));

    // Combine and sort
    let combined = [...taggedProducts, ...taggedLots];

    // Sort combined list
    combined.sort((a, b) => {
        const valA = a[sortBy] || 0;
        const valB = b[sortBy] || 0;
        if (sortOrder === 'desc') return valB > valA ? 1 : -1;
        return valA > valB ? 1 : -1;
    });

    const total = combined.length;
    const paginated = combined.slice((page - 1) * limit, page * limit);

    return {
        products: paginated,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
    };
};

/**
 * Get single product by ID
 */
export const getPublicProductById = async (id) => {
    let item = await Product.findById(id)
        .populate('vendorId', 'name storeName description logo phone address')
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

    // 1. Search products
    const [products, lotSlots] = await Promise.all([
        Product.find({ name: { $regex: query, $options: 'i' }, isActive: true }).limit(5).select('name image'),
        LotSlot.find({ name: { $regex: query, $options: 'i' }, isActive: true }).limit(5).select('name image')
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
