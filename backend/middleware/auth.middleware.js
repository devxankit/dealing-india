import { verifyToken } from '../utils/jwt.util.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import Admin from '../models/Admin.model.js';

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
    // This can be useful if you need access to the full user object
    if (decoded.role === 'user' && decoded.userId) {
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account not found or inactive',
        });
      }
      req.userDoc = user;
    } else if (decoded.role === 'vendor' && decoded.vendorId) {
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
    }

    next();
  } catch (error) {
    next(error);
  }
};

