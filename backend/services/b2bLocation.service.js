import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';

/**
 * Get available B2B vendor locations (states and cities)
 * Returns only locations where vendors have active products
 * @returns {Promise<Object>} { states: [{ name: string, cities: string[] }] }
 */
export const getB2BAvailableLocations = async () => {
  try {
    // Get all active and approved B2B vendors
    const b2bVendors = await Vendor.find({
      vendorType: 'b2b',
      isActive: true,
      status: 'approved',
    })
      .select('_id address')
      .lean();

    if (b2bVendors.length === 0) {
      return { states: [] };
    }

    // Get vendor IDs
    const vendorIds = b2bVendors.map(v => v._id);

    // Check which vendors have at least one active product
    const vendorsWithProducts = await Product.distinct('vendorId', {
      vendorId: { $in: vendorIds },
      isActive: true,
      isVisible: true,
    });

    // Filter vendors to only those with products
    const activeVendorIds = new Set(vendorsWithProducts.map(id => id.toString()));
    const vendorsWithActiveProducts = b2bVendors.filter(v => 
      activeVendorIds.has(v._id.toString())
    );

    // Extract unique states and cities
    const locationMap = new Map(); // state -> Set of cities

    vendorsWithActiveProducts.forEach(vendor => {
      const address = vendor.address;
      if (address && address.state && address.state.trim()) {
        const state = address.state.trim();
        const city = address.city && address.city.trim() ? address.city.trim() : null;

        if (!locationMap.has(state)) {
          locationMap.set(state, new Set());
        }

        if (city) {
          locationMap.get(state).add(city);
        }
      }
    });

    // Convert to array format and sort
    const states = Array.from(locationMap.entries())
      .map(([stateName, citiesSet]) => ({
        name: stateName,
        cities: Array.from(citiesSet).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { states };
  } catch (error) {
    console.error('Error fetching B2B locations:', error);
    throw error;
  }
};
