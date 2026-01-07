import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './backend/models/Order.model.js';
import * as orderAnalyticsService from './backend/services/orderAnalytics.service.js';

dotenv.config({ path: './backend/.env' });

const checkAnalytics = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const totalOrders = await Order.countDocuments();
        console.log('Total Orders in DB:', totalOrders);

        const activeOrders = await Order.countDocuments({ status: { $nin: ['cancelled', 'refunded'] } });
        console.log('Active Orders (non-cancelled/refunded):', activeOrders);

        const todayDate = new Date();
        
        console.log('\n--- Today Analytics ---');
        const todayData = await orderAnalyticsService.getTodayOrdersAnalytics(todayDate);
        console.log('Today has data:', todayData.some(d => d.orders > 0));
        if (todayData.some(d => d.orders > 0)) {
            console.log('Sample today data:', todayData.filter(d => d.orders > 0));
        }

        console.log('\n--- Weekly Analytics ---');
        const weeklyData = await orderAnalyticsService.getWeeklyOrdersAnalytics();
        console.log('Weekly has data:', weeklyData.some(d => d.orders > 0));
        if (weeklyData.some(d => d.orders > 0)) {
            console.log('Sample weekly data:', weeklyData.filter(d => d.orders > 0));
        }

        console.log('\n--- Monthly Analytics ---');
        const monthlyData = await orderAnalyticsService.getMonthlyOrdersAnalytics();
        console.log('Monthly has data:', monthlyData.some(d => d.orders > 0));
        if (monthlyData.some(d => d.orders > 0)) {
            console.log('Sample monthly data:', monthlyData.filter(d => d.orders > 0));
        }

        console.log('\n--- Yearly Analytics ---');
        const yearlyData = await orderAnalyticsService.getYearlyOrdersAnalytics();
        console.log('Yearly has data:', yearlyData.some(d => d.orders > 0));
        if (yearlyData.some(d => d.orders > 0)) {
            console.log('Sample yearly data:', yearlyData.filter(d => d.orders > 0));
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkAnalytics();
