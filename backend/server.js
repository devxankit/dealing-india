import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from upload directory
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
    
    // Start server after database connection
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running!`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   DB Test: http://localhost:${PORT}/api/test-db\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

