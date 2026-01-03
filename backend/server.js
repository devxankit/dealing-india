import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { setupSocketIO } from './config/socket.io.js';

// Import routes
import userAuthRoutes from './routes/userAuth.routes.js';
import vendorAuthRoutes from './routes/vendorAuth.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import vendorManagementRoutes from './routes/vendorManagement.routes.js';
import brandManagementRoutes from './routes/brandManagement.routes.js';
import policyRoutes from './routes/policy.routes.js';
import promoCodeRoutes from './routes/promoCode.routes.js';
import attributeRoutes from './routes/attribute.routes.js';
import attributeValueRoutes from './routes/attributeValue.routes.js';
import attributeSetRoutes from './routes/attributeSet.routes.js';
import customerManagementRoutes from './routes/customerManagement.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import offersRoutes from './routes/offers.routes.js';
import slidersRoutes from './routes/sliders.routes.js';
import categoryManagementRoutes from './routes/categoryManagement.routes.js';
import productManagementRoutes from './routes/productManagement.routes.js';
import taxPricingRoutes from './routes/taxPricing.routes.js';
import productRatingsRoutes from './routes/productRatings.routes.js';
import productFAQsRoutes from './routes/productFAQs.routes.js';
import vendorProductsRoutes from './routes/vendorProducts.routes.js';
import vendorReelsRoutes from './routes/vendorReels.routes.js';
import vendorReviewsRoutes from './routes/vendorReviews.routes.js';
import vendorStockRoutes from './routes/vendorStock.routes.js';
import vendorPromotionsRoutes from './routes/vendorPromotions.routes.js';
import vendorCampaignsRoutes from './routes/vendorCampaigns.routes.js';
import vendorFAQsRoutes from './routes/vendorFAQs.routes.js';
import vendorTaxPricingRoutes from './routes/vendorTaxPricing.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import vendorCustomersRoutes from './routes/vendorCustomers.routes.js';
import vendorInventoryRoutes from './routes/vendorInventory.routes.js';
import vendorPerformanceRoutes from './routes/vendorPerformance.routes.js';
import publicCategoryRoutes from './routes/publicCategory.routes.js';
import publicAttributeRoutes from './routes/publicAttribute.routes.js';
import publicAttributeValueRoutes from './routes/publicAttributeValue.routes.js';
import publicBrandRoutes from './routes/publicBrand.routes.js';
import publicProductRoutes from './routes/publicProduct.routes.js';
import publicVendorRoutes from './routes/publicVendor.routes.js';
import publicSliderRoutes from './routes/publicSlider.routes.js';
import publicReviewRoutes from './routes/publicReview.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import cartRoutes from './routes/cart.routes.js';
import adminSubscriptionRoutes from './routes/adminSubscription.routes.js';
import vendorSubscriptionRoutes from './routes/vendorSubscription.routes.js';
import orderRoutes from './routes/order.routes.js';
import addressRoutes from './routes/address.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import heroBannerAdminRoutes from './routes/heroBannerAdmin.routes.js';
import heroBannerVendorRoutes from './routes/heroBannerVendor.routes.js';
import publicHeroBannerRoutes from './routes/publicHeroBanner.routes.js';
import publicCampaignsRoutes from './routes/publicCampaigns.routes.js';
import vendorOrderRoutes from './routes/vendorOrder.routes.js';
import adminOrderRoutes from './routes/adminOrder.routes.js';
import userNotificationRoutes from './routes/userNotification.routes.js';
import vendorNotificationRoutes from './routes/vendorNotification.routes.js';
import adminNotificationRoutes from './routes/adminNotification.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
const corsOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from upload directory (legacy support - files now stored in Cloudinary)
// Keeping this route for backward compatibility with existing local files
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/upload', express.static(join(__dirname, 'upload')));

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: states[dbStatus] || 'Unknown',
    databaseReady: dbStatus === 1
  });
});

// Database connection test route
app.get('/api/test-db', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    res.json({
      success: dbStatus === 1,
      message: 'Database connection test',
      status: states[dbStatus] || 'Unknown',
      readyState: dbStatus,
      databaseName: mongoose.connection.name,
      host: mongoose.connection.host
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth/user', userAuthRoutes);
app.use('/api/auth/vendor', vendorAuthRoutes);
app.use('/api/auth/admin', adminAuthRoutes);

// Public routes
app.use('/api/categories', publicCategoryRoutes);
app.use('/api/attributes', publicAttributeRoutes);
app.use('/api/attribute-values', publicAttributeValueRoutes);
app.use('/api/brands', publicBrandRoutes);
app.use('/api/products', publicProductRoutes);
app.use('/api/vendors', publicVendorRoutes);
app.use('/api/sliders', publicSliderRoutes);
app.use('/api/reviews', publicReviewRoutes);
app.use('/api/hero-banners', publicHeroBannerRoutes);
app.use('/api/campaigns', publicCampaignsRoutes);

// Admin management routes (require admin authentication)
app.use('/api/admin/vendors', vendorManagementRoutes);
app.use('/api/admin/brands', brandManagementRoutes);
app.use('/api/admin/policies', policyRoutes);
app.use('/api/admin/promocodes', promoCodeRoutes);
app.use('/api/admin/customers', customerManagementRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/offers', offersRoutes);
app.use('/api/admin/sliders', slidersRoutes);
app.use('/api/admin/categories', categoryManagementRoutes);
app.use('/api/admin/products', productManagementRoutes);
app.use('/api/admin', taxPricingRoutes);
app.use('/api/admin/product-ratings', productRatingsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/product-faqs', productFAQsRoutes);
app.use('/api/admin/hero-banners', heroBannerAdminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

// User management routes (require user authentication)
app.use('/api/user/wishlist', wishlistRoutes);
app.use('/api/user/cart', cartRoutes);
app.use('/api/user/orders', orderRoutes);
app.use('/api/user/addresses', addressRoutes);
app.use('/api/user/wallet', walletRoutes);
app.use('/api/user/notifications', userNotificationRoutes);
app.use('/api/admin/subscriptions', adminSubscriptionRoutes);
app.use('/api/vendor/subscriptions', vendorSubscriptionRoutes);

// Vendor management routes (require vendor authentication)
app.use('/api/vendor/products', vendorProductsRoutes);
app.use('/api/vendor/attributes', attributeRoutes);
app.use('/api/vendor/attribute-values', attributeValueRoutes);
app.use('/api/vendor/attribute-sets', attributeSetRoutes);
app.use('/api/vendor/reels', vendorReelsRoutes);
app.use('/api/vendor/reviews', vendorReviewsRoutes);
app.use('/api/vendor/stock', vendorStockRoutes);
app.use('/api/vendor/promotions', vendorPromotionsRoutes);
app.use('/api/vendor/campaigns', vendorCampaignsRoutes);
app.use('/api/vendor/faqs', vendorFAQsRoutes);
app.use('/api/vendor/tax-pricing', vendorTaxPricingRoutes);
app.use('/api/vendor/customers', vendorCustomersRoutes);
app.use('/api/vendor/inventory', vendorInventoryRoutes);
app.use('/api/vendor/performance', vendorPerformanceRoutes);
app.use('/api/vendor/hero-banners', heroBannerVendorRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/vendor/notifications', vendorNotificationRoutes);

// Error handling middleware (must be after routes)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Drop problematic OTP index if it exists
    try {
      const otpCollection = mongoose.connection.collection('otps');
      const indexes = await otpCollection.indexes();
      const problematicIndex = indexes.find(idx =>
        idx.key &&
        idx.key.identifier === 1 &&
        idx.key.type === 1 &&
        idx.key.isUsed === 1 &&
        idx.key.expiresAt === 1 &&
        idx.unique === true
      );
      if (problematicIndex) {
        await otpCollection.dropIndex(problematicIndex.name);
        console.log('✅ Dropped problematic OTP index');
      }
    } catch (indexError) {
      // Index might not exist or already dropped, ignore
      if (!indexError.message.includes('not found')) {
        console.log('Note: OTP index cleanup:', indexError.message);
      }
    }

    // Setup Socket.io
    const io = setupSocketIO(httpServer);
    // Make io instance available to routes/controllers
    app.set('io', io);
    console.log('✅ Socket.io initialized');

    // Start server after database connection
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server is running!`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`   Socket.io: Enabled\n`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Please kill the process using port ${PORT} or change the PORT in .env file`);
        console.error(`   To find and kill the process: netstat -ano | findstr :${PORT}\n`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

