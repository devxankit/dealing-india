
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://ram312908_db_user:Ankit@cluster0.08kfj0h.mongodb.net/dealingindia';

const orderSchema = new mongoose.Schema({
    orderCode: String,
    customerId: String,
    total: Number,
    status: String,
    createdAt: Date
}, { strict: false });

const Order = mongoose.model('Order', orderSchema);

async function checkOrders() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const orders = await Order.find().sort({ createdAt: -1 }).limit(5).select('orderCode createdAt status total customerId');
        console.log('Last 5 orders:');
        orders.forEach(o => {
            console.log(`${o.orderCode} | ${o.createdAt} | ${o.status} | ${o.total} | ${o.customerId}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrders();
