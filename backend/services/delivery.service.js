import DeliveryRule from '../models/DeliveryRule.model.js';
import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import Address from '../models/Address.model.js';

/**
 * Calculate delivery charge for a cart
 * @param {Array} items - Cart items with productId
 * @param {Object} address - Customer address (city, state)
 * @returns {Promise<Object>} Calculation result { total, breakdown }
 */
export const calculateDeliveryCharge = async (items, address) => {
    try {
        if (!items || items.length === 0) {
            return { total: 0, breakdown: [] };
        }

        if (!address || !address.state) {
            // Without address, we can't calculate accurately. Return standard default?
            // Or throw error? Let's return a default estimation or 0.
            // Better to return 0 and let frontend prompt for address.
            return { total: 0, breakdown: [], warning: "Address required for accurate calculation" };
        }

        // 1. Group items by Vendor
        const itemsByVendor = {};
        const productIds = items.map(item => item.productId || item.id);
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map products for easy access
        const productMap = {};
        products.forEach(p => productMap[p._id.toString()] = p);

        for (const item of items) {
            const pid = (item.productId || item.id).toString();
            const product = productMap[pid];
            if (!product) continue;

            const vendorId = product.vendorId.toString();
            if (!itemsByVendor[vendorId]) {
                itemsByVendor[vendorId] = {
                    vendorId,
                    items: [],
                    totalWeight: 0,
                };
            }

            const weight = product.weight || 0.5; // Default 0.5kg if missing
            itemsByVendor[vendorId].items.push(item);
            itemsByVendor[vendorId].totalWeight += (weight * item.quantity);
        }

        // 2. Fetch Vendors and Rules
        const vendorIds = Object.keys(itemsByVendor);
        const vendors = await Vendor.find({ _id: { $in: vendorIds } })
            .populate('deliveryRule')
            .lean();

        // Fetch default rule fallback
        const defaultRule = await DeliveryRule.findOne({ isDefault: true }).lean();

        let totalDeliveryCharge = 0;
        const breakdown = [];

        // 3. Calculate per vendor
        for (const vendor of vendors) {
            const vendorGroup = itemsByVendor[vendor._id.toString()];
            if (!vendorGroup) continue;

            let rule = vendor.deliveryRule || defaultRule;
            let charge = 0;
            let appliedRuleName = "Standard";

            if (rule) {
                appliedRuleName = rule.name;

                if (rule.chargeType === 'flat') {
                    charge = rule.baseCharge;
                } else {
                    // Flexible: Location (Zone) + Weight

                    // A. Determine Zone
                    // Compare Vendor Address vs Customer Address
                    // Assuming vendor.address is an object with { city, state }
                    const vAddr = vendor.address || {};
                    let zone = 'national';
                    let zoneSettings = rule.distanceZones.national;

                    if (vAddr.city && address.city &&
                        vAddr.city.toLowerCase() === address.city.toLowerCase() &&
                        vAddr.state && address.state &&
                        vAddr.state.toLowerCase() === address.state.toLowerCase()) {

                        zone = 'local';
                        zoneSettings = rule.distanceZones.local;

                    } else if (vAddr.state && address.state &&
                        vAddr.state.toLowerCase() === address.state.toLowerCase()) {
                        zone = 'regional';
                        zoneSettings = rule.distanceZones.regional;
                    }

                    // B. Calculate Weight Price
                    let weightPrice = 0;
                    const weight = vendorGroup.totalWeight;

                    // Find bracket
                    // Sort brackets by maxWeight asc
                    const sortedBrackets = rule.weightBrackets.sort((a, b) => a.maxWeight - b.maxWeight);
                    const matchedBracket = sortedBrackets.find(b => weight <= b.maxWeight);

                    if (matchedBracket) {
                        weightPrice = matchedBracket.price;
                    } else {
                        // Weight exceeds all brackets
                        // Logic: Max Bracket Price + (Excess Weight * PerKgPrice)
                        if (sortedBrackets.length > 0) {
                            const maxBracket = sortedBrackets[sortedBrackets.length - 1];
                            const excess = Math.max(0, weight - maxBracket.maxWeight);
                            weightPrice = maxBracket.price + (Math.ceil(excess) * rule.pricePerAdditionalKg);
                        } else {
                            // No brackets defined, just per kg
                            weightPrice = Math.ceil(weight) * rule.pricePerAdditionalKg;
                        }
                    }

                    // C. Final Formula
                    // Charge = ZoneBasePrice + (WeightPrice * ZoneMultiplier) + RuleBaseCharge
                    charge = zoneSettings.basePrice + (weightPrice * zoneSettings.multiplier) + rule.baseCharge;
                }
            } else {
                // No rule found at all? Fallback constant
                charge = 50;
            }

            totalDeliveryCharge += Math.ceil(charge);
            breakdown.push({
                vendorId: vendor._id,
                vendorName: vendor.storeName || vendor.name,
                charge: Math.ceil(charge),
                weight: vendorGroup.totalWeight,
                rule: appliedRuleName
            });
        }

        return {
            total: totalDeliveryCharge,
            breakdown
        };

    } catch (error) {
        console.error("Delivery Calculation Error:", error);
        throw error;
    }
};
