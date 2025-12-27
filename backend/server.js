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
import vendorFAQsRoutes from './routes/vendorFAQs.routes.js';
import vendorTaxPricingRoutes from './routes/vendorTaxPricing.routes.js';
import vendorCustomersRoutes from './routes/vendorCustomers.routes.js';
import vendorInventoryRoutes from './routes/vendorInventory.routes.js';
import vendorPerformanceRoutes from './routes/vendorPerformance.routes.js';
import vendorSupportRoutes from './routes/vendorSupport.routes.js';
import supportDeskRoutes from './routes/supportDesk.routes.js';
import publicCategoryRoutes from './routes/publicCategory.routes.js';
import publicAttributeRoutes from './routes/publicAttribute.routes.js';
import publicAttributeValueRoutes from './routes/publicAttributeValue.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Admin management routes (require admin authentication)
app.use('/api/admin/vendors', vendorManagementRoutes);
app.use('/api/admin/brands', brandManagementRoutes);
app.use('/api/admin/policies', policyRoutes);
app.use('/api/admin/promocodes', promoCodeRoutes);
app.use('/api/admin/attributes', attributeRoutes);
app.use('/api/admin/attribute-values', attributeValueRoutes);
app.use('/api/admin/attribute-sets', attributeSetRoutes);
app.use('/api/admin/customers', customerManagementRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/offers', offersRoutes);
app.use('/api/admin/sliders', slidersRoutes);
app.use('/api/admin/categories', categoryManagementRoutes);
app.use('/api/admin/products', productManagementRoutes);
app.use('/api/admin', taxPricingRoutes);
app.use('/api/admin/product-ratings', productRatingsRoutes);
app.use('/api/admin/product-faqs', productFAQsRoutes);
app.use('/api/admin/support', supportDeskRoutes);

// Vendor management routes (require vendor authentication)
app.use('/api/vendor/products', vendorProductsRoutes);
app.use('/api/vendor/reels', vendorReelsRoutes);
app.use('/api/vendor/reviews', vendorReviewsRoutes);
app.use('/api/vendor/stock', vendorStockRoutes);
app.use('/api/vendor/promotions', vendorPromotionsRoutes);
app.use('/api/vendor/faqs', vendorFAQsRoutes);
app.use('/api/vendor/tax-pricing', vendorTaxPricingRoutes);
app.use('/api/vendor/customers', vendorCustomersRoutes);
app.use('/api/vendor/inventory', vendorInventoryRoutes);
app.use('/api/vendor/performance', vendorPerformanceRoutes);
app.use('/api/vendor/support', vendorSupportRoutes);

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
    console.log('✅ Socket.io initialized');

    // Start server after database connection
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server is running!`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`   Socket.io: Enabled\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

