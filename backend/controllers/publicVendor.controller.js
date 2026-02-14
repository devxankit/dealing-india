import { getApprovedVendors, getVendorById } from '../services/vendorManagement.service.js';
import Product from '../models/Product.model.js';
import redisService from '../services/redis.service.js';

/**
 * Get all approved B2B vendors (public endpoint)
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
    } = req.query;

    // Try to get from cache first
    const cacheKey = `vendors:list:b2b:${JSON.stringify(req.query)}`;
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

    // Get approved and active B2B vendors
    const result = await getApprovedVendors({
      search,
      vendorType: 'b2b',
      isActive: true, // Only show active vendors
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    // OPTIMIZED: Get product counts for all vendors in a single aggregation query
    // This eliminates the N+1 query problem (previously one query per vendor)
    const vendorIds = result.vendors.map(v => v._id);
    const productCounts = await Product.aggregate([
      { $match: { vendorId: { $in: vendorIds }, isActive: true } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } }
    ]);

    // Create a map for O(1) lookup
    const productCountMap = new Map(
      productCounts.map(item => [item._id.toString(), item.count])
    );

    // Enrich vendors with product counts (no additional DB queries needed)
    const enrichedVendors = result.vendors.map((vendor) => {
      const productCount = productCountMap.get(vendor._id.toString()) || 0;

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
        totalProducts: productCount,
        joinDate: vendor.createdAt,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
    });

    const responseData = {
      vendors: enrichedVendors,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };

    // Cache the result for 10 minutes
    try {
      await redisService.set(cacheKey, responseData, 600);
    } catch (cacheError) {
      console.error('Redis SET error (getPublicVendors):', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'B2B vendors retrieved successfully',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single vendor details (public endpoint) (B2B-ONLY)
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
        // Increment vendor views in Redis with 24h TTL
        await redisService.incrWithExpire(`vendor:views:${id}`, 86400);
        return res.status(200).json({
          success: true,
          message: 'Vendor retrieved successfully (cached)',
          data: { vendor: cachedVendor },
        });
      }
    } catch (cacheError) {
      console.error('Redis GET error (getPublicVendor):', cacheError);
    }

    const vendor = await getVendorById(id);

    // STRICT CHECK: Ensure it is a B2B vendor
    if (!vendor || vendor.status !== 'approved' || vendor.isActive === false || vendor.vendorType !== 'b2b') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found or inactive',
      });
    }

    // Increment vendor views in Redis with 24h TTL (to prevent memory leaks)
    // The cron job will sync these views to MongoDB every 5 minutes
    const viewCount = await redisService.incrWithExpire(`vendor:views:${id}`, 86400);

    // Get product count
    const productCount = await Product.countDocuments({
      vendorId: vendor._id,
      isActive: true,
    });

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
      totalProducts: productCount,
      viewCount: parseInt(viewCount) || 0,
      joinDate: vendor.createdAt,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      vendorType: 'b2b'
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


