import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
console.log('--- Initializing Server ---');
console.log(`Working Directory: ${process.cwd()}`);
console.log(`Searching .env at: ${envPath}`);
console.log(`.env file exists? ${fs.existsSync(envPath) ? '✅ YES' : '❌ NO'}`);

dotenv.config();

console.log(`Node Version: ${process.version}`);
console.log(`Environment (NODE_ENV): ${process.env.NODE_ENV || 'not set'}`);
console.log(`MONGODB_URI status: ${process.env.MONGODB_URI ? 'Detected' : 'MISSING'}`);
console.log(`RAZORPAY_KEY_ID status: ${process.env.RAZORPAY_KEY_ID ? 'Detected' : 'MISSING'}`);
console.log('---------------------------');

// Fix for querySrv ECONNREFUSED issues (SRV DNS resolution)
dns.setServers(['8.8.8.8', '8.8.4.4']);
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { setupSocketIO } from './config/socket.io.js';
import { connectRedis } from './config/redis.config.js';
import redisClient from './config/redis.config.js';

// Import routes
import vendorDashboardRoutes from './routes/vendorDashboard.routes.js';
import publicVendorRoutes from './routes/publicVendor.routes.js';
import adminB2BSubscriptionPlanRoutes from './routes/adminB2BSubscriptionPlan.routes.js';
import adminB2BVendorSubscriptionRoutes from './routes/adminB2BVendorSubscription.routes.js';
import adminB2BVendorManagementRoutes from './routes/adminB2BVendorManagement.routes.js';
import adminB2BCategoryManagementRoutes from './routes/adminB2BCategoryManagement.routes.js';
import vendorSubscriptionRoutes from './routes/vendorSubscription.routes.js';
import publicB2BCategoryRoutes from './routes/publicB2BCategory.routes.js';
import publicB2BLocationRoutes from './routes/publicB2BLocation.routes.js';
import publicB2BSubscriptionRoutes from './routes/publicB2BSubscription.routes.js';
import SubscriptionRoutes from './routes/SubscriptionRoute.js';
import upgradeRoutes from './routes/upgrade.routes.js';


import b2bVendorProductsRoutes from './routes/b2bVendorProducts.routes.js';
import b2bVendorShopUnitRoutes from './routes/b2bVendorShopUnit.routes.js';
import lotSlotRoutes from './routes/lotSlot.routes.js';

import adminB2BProductManagementRoutes from './routes/adminB2BProductManagement.routes.js';
import adminLotSlotRoutes from './routes/adminLotSlot.routes.js';
import adminPropertyRoutes from './routes/adminProperty.routes.js';
import publicProductRoutes from './routes/publicProduct.routes.js';

import vendorAuthRoutes from './routes/vendorAuth.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import userAuthRoutes from './routes/userAuth.routes.js';



import adminMediaRoutes from './routes/media.routes.js';
import heroBannerVendorRoutes from './routes/heroBannerVendor.routes.js';
import heroBannerAdminRoutes from './routes/heroBannerAdmin.routes.js';
import heroBannerPublicRoutes from './routes/heroBannerPublic.routes.js';
import adminDefaultBannerRoutes from './routes/adminDefaultBanner.routes.js';
import publicBannerRoutes from './routes/publicBanner.routes.js';
import adminAnalyticsRoutes from './routes/adminAnalytics.routes.js';
import adminDashboardRoutes from './routes/adminDashboard.routes.js';
import businessTypeRoutes from './routes/businessType.routes.js';
import propertyRoutes from './routes/property.routes.js';
import adminBusinessSettingsRoutes from './routes/adminBusinessSettings.routes.js';
import adminNotificationRoutes from './routes/adminNotification.routes.js';
import vendorAnalyticsRoutes from './routes/vendorAnalytics.routes.js';
import vendorNotificationRoutes from './routes/vendorNotification.routes.js';
import userNotificationRoutes from './routes/userNotification.routes.js';
import { B2BSubscriptionExpiryCron } from "./Cron/SubscriptionCron.js";
import { syncVendorViewsCron } from "./Cron/VendorViewSync.cron.js";

B2BSubscriptionExpiryCron.start();
syncVendorViewsCron.start();

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
app.use('/api/auth/vendor', vendorAuthRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/auth/user', userAuthRoutes);
app.use('/api/user', userAuthRoutes);  // Alias for user data routes like /addresses

// Public routes
app.use('/api/vendors', publicVendorRoutes);
app.use('/api/public/b2b-categories', publicB2BCategoryRoutes);
app.use('/api/public', publicB2BLocationRoutes);
app.use('/api/public/b2b-subscription-plans', publicB2BSubscriptionRoutes);


app.use('/api/subscription', SubscriptionRoutes);
app.use('/api/subscriptions', SubscriptionRoutes); // Alias for plural calls from frontend
app.use('/api/subscriptions/upgrade', upgradeRoutes);
app.use('/api/products', publicProductRoutes);





app.use('/api/admin/media', adminMediaRoutes);


// User management routes (require user authentication)
app.use('/api/admin/b2b-subscription-plans', adminB2BSubscriptionPlanRoutes);
app.use('/api/admin/b2b-vendors/subscriptions', adminB2BVendorSubscriptionRoutes);
app.use('/api/admin/b2b-vendors', adminB2BVendorManagementRoutes);
app.use('/api/admin/b2b-categories', adminB2BCategoryManagementRoutes);
app.use('/api/admin/b2b-products', adminB2BProductManagementRoutes);
app.use('/api/admin/lot-slots', adminLotSlotRoutes);
app.use('/api/admin/properties', adminPropertyRoutes);
app.use('/api/vendor/dashboard', vendorDashboardRoutes);
app.use('/api/vendor/subscriptions', vendorSubscriptionRoutes);
app.use('/api/vendor/subscription', vendorSubscriptionRoutes); // Alias for consistency
app.use('/api/vendor/analytics', vendorAnalyticsRoutes);
app.use('/api/vendor/notifications', vendorNotificationRoutes);
app.use('/api/user/notifications', userNotificationRoutes);

// B2B Vendor routes (separate from regular vendor routes)
app.use('/api/b2b-vendor/products', b2bVendorProductsRoutes);
app.use('/api/b2b-vendor/shop-units', b2bVendorShopUnitRoutes);
app.use('/api/b2b-vendor/lot-slots', lotSlotRoutes);


// New Feature Routes
app.use('/api/business-types', businessTypeRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/admin/business-settings', adminBusinessSettingsRoutes);
app.use('/api/vendor/business-settings', adminBusinessSettingsRoutes); // Alias for vendor access

// Order Management routes
// Hero Banner routes
app.use('/api/public/hero-banners', heroBannerPublicRoutes);
app.use('/api/vendor/hero-banners', heroBannerVendorRoutes);
app.use('/api/admin/hero-banners', heroBannerAdminRoutes);
app.use('/api/admin/default-banners', adminDefaultBannerRoutes);
app.use('/api/public/banners', publicBannerRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/reports', adminDashboardRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);


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