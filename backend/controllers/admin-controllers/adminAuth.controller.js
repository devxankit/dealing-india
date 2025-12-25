import { loginAdmin, getAdminById } from '../../services/adminAuth.service.js';

/**
 * Login admin
 * POST /api/auth/admin/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginAdmin(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: result.admin,
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout admin
 * POST /api/auth/admin/logout
 */
export const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged-in admin
 * GET /api/auth/admin/me
 */
export const getMe = async (req, res, next) => {
  try {
    const adminId = req.user.adminId;
    const admin = await getAdminById(adminId);

    res.status(200).json({
      success: true,
      message: 'Admin retrieved successfully',
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

