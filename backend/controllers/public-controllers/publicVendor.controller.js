import { getApprovedVendors, getVendorById } from '../../services/vendorManagement.service.js';
import Product from '../../models/Product.model.js';

/**
 * Get all approved vendors (public endpoint)
 * GET /api/vendors
 */
export const getPublicVendors = async (req, res, next) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      vendorType, // Extract vendorType
    } = req.query;

    // Try to get from cache first
    const cacheKey = `vendors:list:${JSON.stringify(req.query)}`;
    try {
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) return res.status(200).json({
        success: true,
        message: 'Vendors retrieved successfully (cached)',
        data: cachedData,
      });
    } catch (cacheError) {
      console.error('Redis GET error (getPublicVendors):', cacheError);
    }

    // CRITICAL: If vendorType is not explicitly 'b2b', exclude B2B vendors
    // This ensures B2B vendors only show in B2B app, not in regular user app
    let effectiveVendorType = vendorType;
    if (vendorType !== 'b2b') {
      // When vendorType is not 'b2b' (or undefined), exclude B2B vendors
      // This will be handled by getAllVendors which excludes B2B when vendorType is not 'b2b'
      effectiveVendorType = undefined; // Let getAllVendors handle the exclusion
    }

    // Get approved and active vendors
    // When effectiveVendorType is undefined, getAllVendors will exclude B2B vendors
    const result = await getApprovedVendors({
      search,
      vendorType: effectiveVendorType, // Pass undefined to exclude B2B vendors
      isActive: true, // Only show active vendors
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    // CRITICAL: Filter out B2B vendors if vendorType is not 'b2b'
    // This is a safety check to ensure B2B vendors never appear in regular user app
    const filteredVendors = result.vendors.filter(vendor => {
      // If vendorType is not 'b2b', exclude any vendors with vendorType='b2b'
      if (effectiveVendorType !== 'b2b') {
        // Exclude B2B vendors - only include vendors that are NOT B2B
        const vendorType = vendor.vendorType || (vendor.toObject && vendor.toObject().vendorType);
        if (vendorType === 'b2b') {
          console.warn(`⚠️ Filtered out B2B vendor from public vendors list: ${vendor.email || vendor.storeName}`);
          return false;
        }
      }
      return true;
    });

    // Enrich vendors with product counts and ratings
    const enrichedVendors = await Promise.all(
      filteredVendors.map(async (vendor) => {
        // Get product count for this vendor
        const productCount = await Product.countDocuments({
          vendorId: vendor._id,
          isActive: true,
        });

        // Get average rating from vendor's products
        const products = await Product.find({
          vendorId: vendor._id,
          isActive: true,
        })
          .select('rating reviewCount')
          .lean();

        let averageRating = 0;
        let totalReviews = 0;

        if (products.length > 0) {
          const productsWithRating = products.filter(p => p.rating > 0);
          if (productsWithRating.length > 0) {
            const sumRating = productsWithRating.reduce((sum, p) => sum + (p.rating || 0), 0);
            averageRating = sumRating / productsWithRating.length;
            totalReviews = products.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
          }
        }

        // Transform vendor data for public consumption
        return {
          id: vendor._id.toString(),
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          storeName: vendor.storeName,
          storeLogo: vendor.storeLogo,
          storeDescription: vendor.storeDescription,
          address: vendor.address,
          status: vendor.status,
          isVerified: vendor.isEmailVerified || vendor.status === 'approved',
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          reviewCount: totalReviews,
          totalProducts: productCount,
          joinDate: vendor.createdAt,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        };
      })
    );

    // Recalculate total based on filtered vendors (excluding B2B if needed)
    const finalTotal = effectiveVendorType !== 'b2b' ? enrichedVendors.length : result.total;
    const finalTotalPages = Math.ceil(finalTotal / parseInt(limit));

    const responseData = {
      vendors: enrichedVendors,
      total: finalTotal,
      page: result.page,
      limit: result.limit,
      totalPages: finalTotalPages,
    };

    // Cache the result for 10 minutes
    try {
      await redisService.set(cacheKey, responseData, 600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicVendors):', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Vendors retrieved successfully',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public vendor by ID
 * GET /api/vendors/:id
 */
import redisService from '../../services/redis.service.js';

/**
 * Get single vendor details (public endpoint)
 * GET /api/vendors/:id
 */
export const getPublicVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Try to get from cache first
    const cacheKey = `vendor:details:${id}`;
    try {
      const cachedVendor = await redisService.get(cacheKey);
      if (cachedVendor) {
        // Increment vendor views in Redis even if cached
        await redisService.incr(`vendor:views:${id}`);
        return res.status(200).json({
          success: true,
          message: 'Vendor retrieved successfully (cached)',
          data: cachedVendor,
        });
      }
    } catch (cacheError) {
      console.error('Redis GET error (getPublicVendor):', cacheError);
    }

    const vendor = await getVendorById(id);

    if (!vendor || vendor.status !== 'approved' || vendor.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or inactive',
      });
    }

    // Increment vendor views in Redis
    const viewCount = await redisService.incr(`vendor:views:${id}`);

    // Get product count
    const productCount = await Product.countDocuments({
      vendorId: vendor._id,
      isActive: true,
    });

    // Get average rating from vendor's products
    const products = await Product.find({
      vendorId: vendor._id,
      isActive: true,
    })
      .select('rating reviewCount')
      .lean();

    let averageRating = 0;
    let totalReviews = 0;

    if (products.length > 0) {
      const productsWithRating = products.filter(p => p.rating > 0);
      if (productsWithRating.length > 0) {
        const sumRating = productsWithRating.reduce((sum, p) => sum + (p.rating || 0), 0);
        averageRating = sumRating / productsWithRating.length;
        totalReviews = products.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
      }
    }

    // Transform vendor data for public consumption
    const publicVendor = {
      id: vendor._id.toString(),
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      storeName: vendor.storeName,
      storeLogo: vendor.storeLogo,
      storeDescription: vendor.storeDescription,
      address: vendor.address,
      status: vendor.status,
      isVerified: vendor.isEmailVerified || vendor.status === 'approved',
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: totalReviews,
      totalProducts: productCount,
      viewCount: parseInt(viewCount) || 0,
      joinDate: vendor.createdAt,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };

    // Cache the result for 1 hour
    try {
      await redisService.set(cacheKey, publicVendor, 3600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicVendor):', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Vendor retrieved successfully',
      data: { vendor: publicVendor },
    });
  } catch (error) {
    next(error);
  }
};

