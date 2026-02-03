import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';

// Fix for querySrv ECONNREFUSED issues (SRV DNS resolution)
dns.setServers(['8.8.8.8', '8.8.4.4']);
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { setupSocketIO } from './config/socket.io.js';
import { connectRedis } from './config/redis.config.js';
import redisClient from './config/redis.config.js';

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
import categoryManagementRoutes from './routes/categoryManagement.routes.js';
import productManagementRoutes from './routes/productManagement.routes.js';
import productRatingsRoutes from './routes/productRatings.routes.js';
import vendorProductsRoutes from './routes/vendorProducts.routes.js';
import vendorReelsRoutes from './routes/vendorReels.routes.js';
import vendorReviewsRoutes from './routes/vendorReviews.routes.js';
import vendorStockRoutes from './routes/vendorStock.routes.js';
import vendorPromotionsRoutes from './routes/vendorPromotions.routes.js';
import vendorCampaignsRoutes from './routes/vendorCampaigns.routes.js';
import vendorFAQsRoutes from './routes/vendorFAQs.routes.js';
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
import publicReviewRoutes from './routes/publicReview.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import cartRoutes from './routes/cart.routes.js';
import adminSubscriptionRoutes from './routes/adminSubscription.routes.js';
import adminB2BSubscriptionPlanRoutes from './routes/adminB2BSubscriptionPlan.routes.js';
import adminB2BVendorSubscriptionRoutes from './routes/adminB2BVendorSubscription.routes.js';
import adminB2BVendorManagementRoutes from './routes/adminB2BVendorManagement.routes.js';
import adminB2BCategoryManagementRoutes from './routes/adminB2BCategoryManagement.routes.js';
import adminSupportTicketRoutes from './routes/adminSupportTicket.routes.js';
import vendorSubscriptionRoutes from './routes/vendorSubscription.routes.js';
import vendorSupportTicketRoutes from './routes/vendorSupportTicket.routes.js';
import orderRoutes from './routes/order.routes.js';
import addressRoutes from './routes/address.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import heroBannerAdminRoutes from './routes/heroBannerAdmin.routes.js';
import heroBannerVendorRoutes from './routes/heroBannerVendor.routes.js';
import publicHeroBannerRoutes from './routes/publicHeroBanner.routes.js';
import publicCampaignsRoutes from './routes/publicCampaigns.routes.js';
import publicPromoCodeRoutes from './routes/publicPromoCode.routes.js';
import publicDeliveryRoutes from './routes/publicDelivery.routes.js';
import publicB2BCategoryRoutes from './routes/publicB2BCategory.routes.js';
import publicB2BLocationRoutes from './routes/publicB2BLocation.routes.js';
import publicB2BSubscriptionRoutes from './routes/publicB2BSubscription.routes.js';
import SubscriptionRoutes from './routes/vendor-routes/SubscriptionRoute.js';
import vendorOrderRoutes from './routes/vendorOrder.routes.js';
import adminOrderRoutes from './routes/adminOrder.routes.js';
import adminDeliveryRoutes from './routes/adminDelivery.routes.js';
import publicSettingsRoutes from './routes/publicSettings.routes.js';
import adminAnalyticsRoutes from './routes/admin-routes/analytics.routes.js';
import vendorAnalyticsRoutes from './routes/vendor-routes/analytics.routes.js';
import b2bVendorProductsRoutes from './routes/b2bVendorProducts.routes.js';
import b2bVendorDashboardRoutes from './routes/b2bVendorDashboard.routes.js';
import adminB2BProductManagementRoutes from './routes/adminB2BProductManagement.routes.js';

import userReelsRoutes from './routes/userReels.routes.js';
import reelCommentsRoutes from './routes/reelComments.routes.js';
import userNotificationRoutes from './routes/userNotification.routes.js';
import vendorNotificationRoutes from './routes/vendorNotification.routes.js';
import adminNotificationRoutes from './routes/adminNotification.routes.js';
import vendorWalletRoutes from './routes/vendorWallet.routes.js';
import adminVendorWalletRoutes from './routes/adminVendorWallet.routes.js';
import walletAdminRoutes from './routes/wallet.admin.routes.js';
import returnRequestRoutes from './routes/returnRequest.routes.js';
import vendorReturnRoutes from './routes/vendorReturn.routes.js';
import adminReturnRoutes from './routes/adminReturn.routes.js';
import vendorChatRoutes from './routes/vendorChat.routes.js';
import userSupportTicketRoutes from './routes/userSupportTicket.routes.js';
import adminPromotionalReelRoutes from './routes/adminPromotionalReel.routes.js';
import userPromotionalReelRoutes from './routes/userPromotionalReel.routes.js';
import adminMediaRoutes from './routes/admin-routes/media.routes.js';
import userChatRoutes from './routes/userChat.routes.js';
import timeWarpRoutes from './routes/timeWarp.routes.js';

// Mega Reward routes
import adminMegaRewardRoutes from './routes/adminMegaReward.routes.js';
import userMegaRewardRoutes from './routes/userMegaReward.routes.js';
import publicMegaRewardRoutes from './routes/publicMegaReward.routes.js';
import publicReelRoutes from './routes/publicReel.routes.js';
import { B2BSubscriptionExpiryCron, subscriptionExpiryCron } from "./Cron/SubscriptionCron.js";


subscriptionExpiryCron.start();
B2BSubscriptionExpiryCron.start();

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(compression());

// Trust proxy for Render/Vercel to get correct IP and protocol
app.set('trust proxy', true);

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
// Default allowed origins (always included)
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://dealing-india.vercel.app',
  'https://dealing-india-*.vercel.app',
  'https://www.dealingindia.com',
  'https://dealingindia.com',
  'https://www.dealingindia.in',
  'https://dealingindia.in',
  'https://dealing-india.onrender.com',
];

// Get origins from environment variable if set
const envOrigins = process.env.SOCKET_CORS_ORIGIN
  ? process.env.SOCKET_CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [];

// Merge and deduplicate origins (environment origins + defaults)
const corsOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

// CORS configuration with better production support
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel and Render preview/backend deployments
    if (origin.includes('vercel.app') || origin.includes('onrender.com')) {
      return callback(null, true);
    }

    // Log blocked origin for debugging
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
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
    databaseReady: dbStatus === 1,
    redis: redisClient.isReady ? 'Connected' : 'Disconnected',
    redisReady: redisClient.isReady,
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Registration test route for debugging production issues
app.post('/api/test-register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check database connection
    const dbStatus = mongoose.connection.readyState;
    const dbConnected = dbStatus === 1;

    // Check email service
    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    res.json({
      success: true,
      message: 'Registration test endpoint',
      checks: {
        databaseConnected: dbConnected,
        databaseState: dbStatus,
        emailConfigured,
        hasMongoDBURI: !!process.env.MONGODB_URI,
        hasJWTSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        corsOriginsCount: corsOrigins.length,
      },
      receivedData: {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
        hasPhone: !!phone,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
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
import { razorpayWebhook } from "./controllers/SubscriptionCtrl.js";

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
app.use('/api/reviews', publicReviewRoutes);
app.use('/api/hero-banners', publicHeroBannerRoutes);
app.use('/api/campaigns', publicCampaignsRoutes);
app.use('/api/public/promocodes', publicPromoCodeRoutes);
app.use('/api/public/delivery', publicDeliveryRoutes);
app.use('/api/public/b2b-categories', publicB2BCategoryRoutes);
app.use('/api/public', publicB2BLocationRoutes);
app.use('/api/public/b2b-subscription-plans', publicB2BSubscriptionRoutes);
app.use('/api/settings', publicSettingsRoutes);
app.use('/api/mega-reward', publicMegaRewardRoutes);
app.use('/api/public/reels', publicReelRoutes);
app.use('/api/subscription', SubscriptionRoutes);

// Admin management routes (require admin authentication)
app.use('/api/admin/vendors', vendorManagementRoutes);
app.use('/api/admin/brands', brandManagementRoutes);
app.use('/api/admin/policies', policyRoutes);
app.use('/api/admin/delivery-rules', adminDeliveryRoutes);
app.use('/api/admin/promocodes', promoCodeRoutes);
app.use('/api/admin/customers', customerManagementRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/offers', offersRoutes);
app.use('/api/admin/categories', categoryManagementRoutes);
app.use('/api/admin/products', productManagementRoutes);
app.use('/api/admin/product-ratings', productRatingsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/hero-banners', heroBannerAdminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/vendor-wallets', adminVendorWalletRoutes);
app.use('/api/admin/returns', adminReturnRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/wallet', walletAdminRoutes);
app.use('/api/admin/promotional-reels', adminPromotionalReelRoutes);
app.use('/api/admin/mega-reward', adminMegaRewardRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/dev/time', timeWarpRoutes);


// User management routes (require user authentication)
app.use('/api/user/wishlist', wishlistRoutes);
app.use('/api/user/cart', cartRoutes);
app.use('/api/user/orders', orderRoutes);
app.use('/api/user/addresses', addressRoutes);
app.use('/api/user/wallet', walletRoutes);
app.use('/api/user/notifications', userNotificationRoutes);
app.use('/api/user/reels', userReelsRoutes);
app.use('/api/user/promotional-reels', userPromotionalReelRoutes);
app.use('/api/user/reels', reelCommentsRoutes);
app.use('/api/user/support-tickets', userSupportTicketRoutes);
app.use('/api/user/mega-reward', userMegaRewardRoutes);
app.use('/api/admin/subscriptions', adminSubscriptionRoutes);
app.use('/api/admin/b2b-subscription-plans', adminB2BSubscriptionPlanRoutes);
app.use('/api/admin/b2b-vendors/subscriptions', adminB2BVendorSubscriptionRoutes);
app.use('/api/admin/b2b-vendors', adminB2BVendorManagementRoutes);
app.use('/api/admin/b2b-categories', adminB2BCategoryManagementRoutes);
app.use('/api/admin/b2b-products', adminB2BProductManagementRoutes);
app.use('/api/admin/support-tickets', adminSupportTicketRoutes);
app.use('/api/vendor/subscriptions', vendorSubscriptionRoutes);
app.use('/api/vendor/support-tickets', vendorSupportTicketRoutes);
app.use('/api/vendor/chat', vendorChatRoutes);
app.use('/api/user/chat', userChatRoutes);
app.use('/api/user/returns', returnRequestRoutes);

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
app.use('/api/vendor/customers', vendorCustomersRoutes);
app.use('/api/vendor/inventory', vendorInventoryRoutes);
app.use('/api/vendor/performance', vendorPerformanceRoutes);
app.use('/api/vendor/hero-banners', heroBannerVendorRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/vendor/notifications', vendorNotificationRoutes);
app.use('/api/vendor/wallet', vendorWalletRoutes);
app.use('/api/vendor/returns', vendorReturnRoutes);
app.use('/api/vendor/analytics', vendorAnalyticsRoutes);
app.use('/api/subscription', SubscriptionRoutes);

// B2B Vendor routes (separate from regular vendor routes)
app.use('/api/b2b-vendor/products', b2bVendorProductsRoutes);
app.use('/api/b2b-vendor/dashboard', b2bVendorDashboardRoutes);


// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  Unhandled promise rejection logged. Server continues running.');
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // In production, log and continue; in development, might want to exit
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});
app.post(
  "/api/v1/razorpay-webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);
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
    // Validate critical environment variables
    const requiredEnvVars = {
      'MONGODB_URI': process.env.MONGODB_URI,
      'JWT_SECRET': process.env.JWT_SECRET,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('❌ CRITICAL: Missing required environment variables:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('⚠️  Server will start but may not function correctly.');
    }

    // Check email configuration (critical for registration)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('⚠️  WARNING: Email service not configured (EMAIL_USER or EMAIL_PASS missing)');
      console.error('⚠️  Registration will fail without email service.');
    } else {
      console.log('✅ Email service configuration found');
    }

    // Connect to database
    await connectDB();

    // Connect to Redis
    await connectRedis();

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

    // Create TTL index for TemporaryRegistration collection
    try {
      const tempRegCollection = mongoose.connection.collection('temporaryregistrations');
      // Check if TTL index already exists
      const indexes = await tempRegCollection.indexes();
      const ttlIndexExists = indexes.some(idx =>
        idx.key && idx.key.expiresAt === 1 && idx.expireAfterSeconds !== undefined
      );

      if (!ttlIndexExists) {
        await tempRegCollection.createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0 }
        );
        console.log('✅ Created TTL index for TemporaryRegistration');
      }
    } catch (ttlIndexError) {
      // Index might already exist or collection doesn't exist yet, ignore
      if (!ttlIndexError.message.includes('already exists') &&
        !ttlIndexError.message.includes('not found')) {
        console.log('Note: TTL index creation:', ttlIndexError.message);
      }
    }

    // Setup Socket.io
    const io = setupSocketIO(httpServer, corsOrigins);
    // Make io instance available to routes/controllers
    app.set('io', io);
    console.log('✅ Socket.io initialized');

    // Start server after database connection
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server is running!`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   CORS Origins: ${corsOrigins.length} configured`);
      console.log(`   Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not Connected'}`);
      console.log(`   Redis: ${redisClient.isReady ? '✅ Connected' : '❌ Not Connected'}`);
      console.log(`   Email Service: ${(process.env.EMAIL_USER && process.env.EMAIL_PASS) ? '✅ Configured' : '❌ Not Configured'}`);

      if (process.env.NODE_ENV === 'production') {
        console.log(`   Health Check: https://dealing-india.onrender.com/api/health`);
        console.log(`   Production URL: https://dealing-india.onrender.com`);
      } else {
        console.log(`   Health Check: http://localhost:${PORT}/api/health`);
        console.log(`   DB Test: http://localhost:${PORT}/api/test-db`);
      }

      console.log(`   Socket.io: Enabled\n`);

      // Production-specific warnings
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.error('\n🚨 CRITICAL WARNING: Email service not configured in production!');
          console.error('🚨 Registration will fail. Please set EMAIL_USER and EMAIL_PASS in Render environment variables.');
        }
        if (!process.env.SOCKET_CORS_ORIGIN) {
          console.warn('\n⚠️  WARNING: SOCKET_CORS_ORIGIN not set. Socket.io may not work correctly.');
        }
      }
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
// Restart trigger