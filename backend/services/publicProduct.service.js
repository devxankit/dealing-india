import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import LotSlot from '../models/LotSlot.model.js';
import Vendor from '../models/Vendor.model.js';
import B2BCategory from '../models/B2BCategory.model.js';
import ShopUnit from '../models/ShopUnit.model.js';

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
        excludeBusinessTypes, // Added excludeBusinessTypes to destructuring
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
    if (state || city || area || market || businessType || businessSubType || excludeBusinessTypes) {
        const vendorQuery = { isActive: true };
        if (state) vendorQuery['address.state'] = { $regex: new RegExp(`^${String(state).trim()}$`, 'i') };
        if (city) vendorQuery['address.city'] = { $regex: new RegExp(`^${String(city).trim()}$`, 'i') };
        if (area) vendorQuery['address.area'] = { $regex: new RegExp(`^${String(area).trim()}$`, 'i') };
        if (market) {
            const marketValue = String(market).trim();
            const escapedMarket = marketValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            vendorQuery['address.market'] = { $regex: new RegExp(`^${escapedMarket}$`, 'i') };
        }
        if (businessType) {
            vendorQuery.businessType = { $regex: new RegExp(`^${String(businessType).trim()}$`, 'i') };
        } else if (excludeBusinessTypes) {
            const excludeArr = Array.isArray(excludeBusinessTypes) ? excludeBusinessTypes : String(excludeBusinessTypes).split(',').map(t => t.trim());
            if (excludeArr.length > 0) {
                vendorQuery.businessType = { $nin: excludeArr.map(t => new RegExp(`^${t}$`, 'i')) };
            }
        }
        if (businessSubType) vendorQuery.selectedSubTypes = { $regex: new RegExp(`^${String(businessSubType).trim()}$`, 'i') };

        const matchingVendors = await Vendor.find(vendorQuery).select('_id').lean();
        locationVendorIds = matchingVendors.map(v => v._id);

        // If market filter is applied but no vendors found, return empty results
        if (market && locationVendorIds.length === 0) {
            locationVendorIds = []; // Empty array will result in no products
        }
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

    const effectiveItemType = itemType || 'product';

    if (effectiveItemType === 'product' || effectiveItemType === 'all') {
        pipeline.push({ $match: productQuery });
        pipeline.push({ $addFields: { itemType: 'product' } });
    } else {
        // If sorting strictly by 'lotslot', start empty
        pipeline.push({ $match: { _id: null } }); // Match nothing in Product
    }

    // 2. Union with LotSlot
    if (effectiveItemType === 'lotslot' || effectiveItemType === 'all') {
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
                {
                    $addFields: {
                        vendorIdRef: '$vendorId',
                        shopIdRef: '$shopUnitId'
                    }
                },
                // Populate Vendor
                {
                    $lookup: {
                        from: 'vendors',
                        localField: 'vendorId',
                        foreignField: '_id',
                        pipeline: [{ $project: { _id: 1, name: 1, storeName: 1, address: 1, phone: 1, logo: 1 } }],
                        as: 'vendorId'
                    }
                },
                { $unwind: { path: '$vendorId', preserveNullAndEmptyArrays: true } },
                // Populate ShopUnit by product's shopUnitId (for shop-listing)
                {
                    $lookup: {
                        from: 'shopunits',
                        localField: 'shopIdRef',
                        foreignField: '_id',
                        as: 'shopUnit'
                    }
                },
                { $unwind: { path: '$shopUnit', preserveNullAndEmptyArrays: true } },
                // Fallback: ShopUnit by vendorId (one per vendor) so shop name always available
                {
                    $lookup: {
                        from: 'shopunits',
                        localField: 'vendorIdRef',
                        foreignField: 'vendorId',
                        as: 'vendorShopUnit'
                    }
                },
                { $unwind: { path: '$vendorShopUnit', preserveNullAndEmptyArrays: true } }
            ]
        }
    });

    // Execute
    const result = await Product.aggregate(pipeline);

    const metadata = result[0].metadata;
    let data = result[0].data;

    const total = metadata.length > 0 ? metadata[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Merge ShopUnit data: shop name = listing name (from shop add form), not registration company name
    data = data.map(p => {
        const shop = p.shopUnit || p.vendorShopUnit;

        if (shop) {
            p.shopName = shop.name;
            p.shopUnit = p.shopUnit || shop;
        }

        if (p.formType === 'shop-listing' && shop) {
            p.name = p.name || shop.name;
            p.description = p.description || shop.description;
            p.image = p.image || (shop.images && shop.images[0]);
            p.images = (p.images && p.images.length > 0) ? p.images : shop.images;
            p.minPrice = p.minPrice ?? shop.minPrice;
            p.maxPrice = p.maxPrice ?? shop.maxPrice;
            p.price = (p.price === undefined || p.price === 0) ? shop.minPrice : p.price;
        }

        return p;
    });

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
            .populate('shopUnitId')
            .lean();
        isLotSlot = true;
    }

    if (!item) throw new Error('Product not found');

    // Tag it - with .lean(), item is already a plain object
    let taggedItem = { ...item, itemType: isLotSlot ? 'lotslot' : 'product' };

    // Merge ShopUnit data for shop listings or items (shop name = listing name, not registration)
    let shop = taggedItem.shopUnitId;
    if (!shop && taggedItem.vendorId?._id) {
        shop = await ShopUnit.findOne({ vendorId: taggedItem.vendorId._id }).lean();
    }

    if (shop) {
        if (!isLotSlot && taggedItem.formType === 'shop-listing') {
            taggedItem.name = taggedItem.name || shop.name;
            taggedItem.description = taggedItem.description || shop.description;
            taggedItem.image = taggedItem.image || (shop.images && shop.images[0]);
            taggedItem.images = (taggedItem.images && taggedItem.images.length > 0) ? taggedItem.images : shop.images;
            taggedItem.minPrice = taggedItem.minPrice ?? shop.minPrice;
            taggedItem.maxPrice = taggedItem.maxPrice ?? shop.maxPrice;
            if (taggedItem.price === undefined || taggedItem.price === 0) taggedItem.price = shop.minPrice;
        }
        taggedItem.shopName = shop.name;
        taggedItem.shopUnit = shop;
    } else {
        taggedItem.shopName = taggedItem.vendorId?.storeName || taggedItem.vendorId?.name;
    }

    return taggedItem;
};

/**
 * Get search suggestions
 */
export const getB2BSearchSuggestions = async (query) => {
    if (!query || query.trim().length < 1) return [];

    const suggestions = [];

    // Removed exclusion of Real Estate types to support global search for all vendors
    const [products, lotSlots, shopItems, vendors, shopUnits, properties] = await Promise.all([
        Product.find({
            name: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('name image vendorId formType'),
        LotSlot.find({
            name: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('name image vendorId'),
        Product.find({
            'items.itemName': { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('items name vendorId formType'),
        Vendor.find({
            storeName: { $regex: query, $options: 'i' },
            status: 'approved',
            isActive: true
        }).limit(5).select('storeName storeLogo address businessType'),
        ShopUnit.find({ name: { $regex: query, $options: 'i' } })
            .limit(5)
            .populate({
                path: 'vendorId',
                match: {
                    status: 'approved',
                    isActive: true
                },
                select: 'storeName storeLogo address status isActive businessType'
            })
            .lean(),
        // Added Property search
        mongoose.model('Property').find({
            title: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(5).select('title media images location vendorId listingType').lean()
    ]);

    // Products - dedup by name (case-insensitive)
    products.forEach(p => {
        const isDup = suggestions.some(s =>
            s.text?.toLowerCase() === p.name?.toLowerCase()
        );
        if (!isDup) {
            suggestions.push({
                text: p.name,
                context: 'In Products',
                type: 'product',
                image: p.image || null,
                vendorId: p.vendorId?.toString(),
                formType: p.formType
            });
        }
    });

    // LotSlots - dedup by name (case-insensitive)
    lotSlots.forEach(l => {
        const isDup = suggestions.some(s =>
            s.text?.toLowerCase() === l.name?.toLowerCase() && s.type === 'lotslot'
        );
        if (!isDup) {
            suggestions.push({
                text: l.name,
                context: 'In Lots/Slots',
                type: 'lotslot',
                image: l.image || (l.images && l.images[0]) || null,
                vendorId: l.vendorId?.toString()
            });
        }
    });

    // Property results
    properties.forEach(p => {
        const imageUrl = p.media?.[0]?.url || p.images?.[0] || null;
        suggestions.push({
            id: p._id.toString(),
            text: p.title,
            context: `${p.listingType || 'Property'} · ${p.location?.city || ''}`,
            type: 'property',
            image: imageUrl,
            vendorId: p.vendorId?.toString()
        });
    });

    // Shop item names inside shop listings - dedup by itemName (case-insensitive)
    shopItems.forEach(p => {
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
                if (item.itemName && item.itemName.toLowerCase().includes(query.toLowerCase()) && suggestions.length < 20) {
                    const isDup = suggestions.some(s =>
                        s.text?.toLowerCase() === item.itemName?.toLowerCase()
                    );
                    if (!isDup) {
                        suggestions.push({
                            text: item.itemName,
                            context: `In ${p.name}`,
                            type: 'product',
                            image: (item.images && item.images[0]) || null,
                            vendorId: p.vendorId?.toString(),
                            formType: p.formType
                        });
                    }
                }
            });
        }
    });

    // Store suggestions from direct vendor names
    vendors.forEach(v => {
        const vendorIdStr = v._id.toString();
        const storeNameLower = v.storeName?.toLowerCase();

        // Check for name duplicates with products
        const dupIdx = suggestions.findIndex(s =>
            s.text?.toLowerCase() === storeNameLower && s.type !== 'store'
        );
        if (dupIdx !== -1) suggestions.splice(dupIdx, 1);

        if (!suggestions.some(s => s.type === 'store' && s.vendorId === vendorIdStr)) {
            const isRealEstate = v.businessType?.match(/developer|broker/i);
            suggestions.push({
                type: 'store',
                text: v.storeName,
                context: isRealEstate ? `${v.businessType} Office · ${v.address?.city || ''}` : (v.address?.city ? `Store · ${v.address.city}` : 'Store'),
                vendorId: vendorIdStr,
                image: v.storeLogo || null,
                isRealEstate: !!isRealEstate,
                businessType: v.businessType
            });
        }
    });

    // Store suggestions from ShopUnit names
    shopUnits.forEach(unit => {
        const vendor = unit.vendorId;
        if (!vendor || vendor.status !== 'approved' || vendor.isActive === false) return;

        const vendorIdStr = vendor._id.toString();
        const shopNameLower = unit.name?.toLowerCase();

        // If suggestion already exists for this vendor but uses storeName, update it to use shopName if it matches search better
        const existingStoreIdx = suggestions.findIndex(s => s.type === 'store' && s.vendorId === vendorIdStr);
        if (existingStoreIdx !== -1) {
            if (shopNameLower.includes(query.toLowerCase())) {
                suggestions[existingStoreIdx].text = unit.name;
            }
        } else {
            // Check for name duplicates with products
            const dupIdx = suggestions.findIndex(s =>
                s.text?.toLowerCase() === shopNameLower && s.type !== 'store'
            );
            if (dupIdx !== -1) suggestions.splice(dupIdx, 1);

            const isRealEstate = vendor.businessType?.match(/developer|broker/i);
            suggestions.push({
                type: 'store',
                text: unit.name,
                context: isRealEstate ? `${vendor.businessType} Office · ${vendor.address?.city || ''}` : (vendor.address?.city ? `Store · ${vendor.address.city}` : 'Store'),
                vendorId: vendorIdStr,
                image: (unit.images && unit.images[0]) || vendor.storeLogo || null,
                isRealEstate: !!isRealEstate,
                businessType: vendor.businessType
            });
        }
    });

    return suggestions;
};
