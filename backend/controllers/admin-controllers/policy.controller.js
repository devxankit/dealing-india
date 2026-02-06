import {
  getAllPolicies,
  getPolicyByKey,
  upsertPolicy,
} from '../../services/policy.service.js';

/**
 * Get all policies
 * GET /api/admin/policies
 */
export const getAll = async (req, res, next) => {
  try {
    const policies = await getAllPolicies();
    res.status(200).json({
      success: true,
      message: 'Policies retrieved successfully',
      data: { policies },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get policy by key
 * GET /api/admin/policies/:key
 */
export const getByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const policy = await getPolicyByKey(key);
    
    // Return 200 with null policy if not found (frontend will handle default content)
    res.status(200).json({
      success: true,
      message: policy ? 'Policy retrieved successfully' : 'Policy not found',
      data: { policy: policy || null },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update policy
 * PUT /api/admin/policies/:key
 */
export const upsert = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { content } = req.body;
    const adminId = req.user.adminId;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Policy content is required',
      });
    }

    const policy = await upsertPolicy(key, content, adminId);
    res.status(200).json({
      success: true,
      message: 'Policy saved successfully',
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};

