
import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    name: String,
    vendorType: String,
    isActive: Boolean,
    status: String,
    businessType: String,
    address: {
        market: String,
        state: String,
        city: String,
        area: String
    }
}, { strict: false });

const productSchema = new mongoose.Schema({
    vendorId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
    isVisible: Boolean
}, { strict: false });

const Vendor = mongoose.model('Vendor', vendorSchema, 'vendors');
const Product = mongoose.model('Product', productSchema, 'products');

const MONGO_URI = 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

async function getB2BAvailableLocations(options = {}) {
    try {
        const { businessTypeFilter, businessTypes = [] } = options;

        const vendorQuery = {
            vendorType: 'b2b',
            isActive: true,
            status: 'approved',
        };

        if (businessTypeFilter === 'include' && businessTypes.length > 0) {
            vendorQuery.$or = businessTypes.map(bt => ({
                businessType: { $regex: `^${bt}$`, $options: 'i' }
            }));
        } else if (businessTypeFilter === 'exclude' && businessTypes.length > 0) {
            vendorQuery.$and = businessTypes.map(bt => ({
                businessType: { $not: { $regex: `^${bt}$`, $options: 'i' } }
            }));
        }

        console.log('Query:', JSON.stringify(vendorQuery, null, 2));

        const b2bVendors = await Vendor.find(vendorQuery).lean();
        console.log(`Found ${b2bVendors.length} matching vendors.`);

        if (b2bVendors.length === 0) return { states: [], splitMarkets: [] };

        const vendorIds = b2bVendors.map(v => v._id);
        const vendorsWithProducts = await Product.distinct('vendorId', {
            vendorId: { $in: vendorIds },
            isActive: true,
            isVisible: true,
        });
        console.log(`Vendors with products: ${vendorsWithProducts.length}`);

        const activeVendorIds = new Set(vendorsWithProducts.map(id => id.toString()));
        const vendorsWithActiveProducts = b2bVendors.filter(v =>
            activeVendorIds.has(v._id.toString())
        );

        const marketsSet = new Set();
        vendorsWithActiveProducts.forEach(vendor => {
            const address = vendor.address;
            if (address && address.market && address.market.trim()) {
                marketsSet.add(address.market.trim());
            }
        });

        const markets = Array.from(marketsSet).sort();
        console.log('Markets:', markets);
        return markets;

    } catch (error) {
        console.error('Error:', error);
    }
}

async function run() {
    await mongoose.connect(MONGO_URI);
    await getB2BAvailableLocations({
        businessTypeFilter: 'exclude',
        businessTypes: ['Developer', 'Property Broker']
    });
    mongoose.disconnect();
}

run();
