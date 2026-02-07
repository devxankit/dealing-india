import { verifyToken } from '../utils/jwt.util.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';
import User from '../models/User.model.js';

/**
 * Optional authentication middleware - verifies JWT token if present but doesn't fail if expired
 * Useful for logout endpoints where we want to allow logout even with expired tokens
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try to verify token, but don't fail if expired
    try {
      const decoded = verifyToken(token);
      req.user = decoded;

      // Optionally fetch user document if token is valid
      if (decoded.role === 'vendor' && decoded.vendorId) {
        const vendor = await Vendor.findById(decoded.vendorId);
        if (vendor && vendor.isActive) {
          req.userDoc = vendor;
        }
      } else if (decoded.role === 'admin' && decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (admin && admin.isActive) {
          req.userDoc = admin;
        }
      } else if (decoded.role === 'user' && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.userDoc = user;
        }
      }
    } catch (error) {
      // Token is invalid or expired, but we continue anyway for logout
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token',
      });
    }

    // Attach user info to request based on role
    req.user = decoded;

    // Optionally, fetch and attach full user document
    try {
      if (decoded.role === 'vendor' && decoded.vendorId) {
        const vendor = await Vendor.findById(decoded.vendorId);
        if (!vendor || !vendor.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Vendor account not found or inactive',
          });
        }
        req.userDoc = vendor;
      } else if (decoded.role === 'admin' && decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Admin account not found or inactive',
          });
        }
        req.userDoc = admin;
      } else if (decoded.role === 'user' && decoded.id) {
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'User account not found or inactive',
          });
        }
        req.userDoc = user;
      }
    } catch (dbError) {
      console.error('Error fetching user document in auth middleware:', {
        message: dbError.message,
        role: decoded.role,
        userId: decoded.vendorId || decoded.adminId,
      });
      // Continue without userDoc - some endpoints might not need it
    }

    next();
  } catch (error) {
    console.error('Error in authenticate middleware:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    next(error);
  }
};


// Aliases for compatibility
export const protect = authenticate;
export const protectVendor = authenticate;
export const protectAdmin = authenticate;

/**
 * Authorization middleware - allows only specific roles
 * @param {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.',
      });
    }
    next();
  };
};

// Role-specific authorization middlewares
export const adminOnly = authorize('admin');
export const vendorOnly = authorize('vendor');
