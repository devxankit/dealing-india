import {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../services/address.service.js';

/**
 * Get all addresses for authenticated user
 * GET /api/user/addresses
 */
export const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const addresses = await getUserAddresses(userId);

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: {
        addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get address by ID
 * GET /api/user/addresses/:id
 */
export const getAddress = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const address = await getAddressById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: {
        address,
      },
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};

/**
 * Create a new address
 * POST /api/user/addresses
 */
export const createAddressController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token',
      });
    }
    const addressData = req.body;

    const address = await createAddress(userId, addressData);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: {
        address,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an address
 * PUT /api/user/addresses/:id
 */
export const updateAddressController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const addressData = req.body;

    const address = await updateAddress(id, userId, addressData);

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address,
      },
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};

/**
 * Delete an address
 * DELETE /api/user/addresses/:id
 */
export const deleteAddressController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    await deleteAddress(id, userId);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};

/**
 * Set address as default
 * PUT /api/user/addresses/:id/default
 */
export const setDefaultAddressController = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const address = await setDefaultAddress(id, userId);

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: {
        address,
      },
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }
    next(error);
  }
};

