import Address from '../models/Address.model.js';
import mongoose from 'mongoose';

/**
 * Get all addresses for a user
 * @param {String} userId - User ID
 * @returns {Promise<Array>} List of addresses
 */
export const getUserAddresses = async (userId) => {
  try {
    const addresses = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return addresses.map((addr) => ({
      id: addr._id.toString(),
      _id: addr._id,
      name: addr.name,
      fullName: addr.fullName || addr.name, // Use fullName if exists, else name
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country,
      phone: addr.phone,
      isDefault: addr.isDefault,
      type: addr.type,
      createdAt: addr.createdAt,
      updatedAt: addr.updatedAt,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get address by ID
 * @param {String} addressId - Address ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Address details
 */
export const getAddressById = async (addressId, userId) => {
  try {
    const address = await Address.findOne({
      _id: addressId,
      userId,
    }).lean();

    if (!address) {
      throw new Error('Address not found');
    }

    return {
      id: address._id.toString(),
      _id: address._id,
      name: address.name,
      fullName: address.fullName || address.name,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      type: address.type,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new address
 * @param {String} userId - User ID
 * @param {Object} addressData - Address data
 * @returns {Promise<Object>} Created address
 */
export const createAddress = async (userId, addressData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      name,
      fullName,
      address,
      city,
      state,
      zipCode,
      country = 'India',
      phone,
      type = 'home',
      isDefault = false,
    } = addressData;

    // If setting as default, unset other defaults
    if (isDefault) {
      await Address.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // If this is the first address, make it default
    const addressCount = await Address.countDocuments({ userId });
    const shouldBeDefault = addressCount === 0 || isDefault;

    const newAddress = await Address.create({
      userId,
      name: name || fullName,
      fullName: fullName || name,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      type,
      isDefault: shouldBeDefault,
    });

    return {
      id: newAddress._id.toString(),
      _id: newAddress._id,
      name: newAddress.name,
      fullName: newAddress.fullName || newAddress.name,
      address: newAddress.address,
      city: newAddress.city,
      state: newAddress.state,
      zipCode: newAddress.zipCode,
      country: newAddress.country,
      phone: newAddress.phone,
      isDefault: newAddress.isDefault,
      type: newAddress.type,
      createdAt: newAddress.createdAt,
      updatedAt: newAddress.updatedAt,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update an address
 * @param {String} addressId - Address ID
 * @param {String} userId - User ID (for authorization)
 * @param {Object} addressData - Updated address data
 * @returns {Promise<Object>} Updated address
 */
export const updateAddress = async (addressId, userId, addressData) => {
  try {
    const {
      name,
      fullName,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      type,
      isDefault,
    } = addressData;

    const addressDoc = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!addressDoc) {
      throw new Error('Address not found');
    }

    // If setting as default, unset other defaults
    if (isDefault === true && !addressDoc.isDefault) {
      await Address.updateMany(
        { userId, _id: { $ne: addressId }, isDefault: true },
        { isDefault: false }
      );
    }

    // Update fields
    if (name !== undefined || fullName !== undefined) {
      addressDoc.name = name || fullName || addressDoc.name;
      addressDoc.fullName = fullName || name || addressDoc.fullName || addressDoc.name;
    }
    if (address !== undefined) addressDoc.address = address;
    if (city !== undefined) addressDoc.city = city;
    if (state !== undefined) addressDoc.state = state;
    if (zipCode !== undefined) addressDoc.zipCode = zipCode;
    if (country !== undefined) addressDoc.country = country;
    if (phone !== undefined) addressDoc.phone = phone;
    if (type !== undefined) addressDoc.type = type;
    if (isDefault !== undefined) addressDoc.isDefault = isDefault;

    await addressDoc.save();

    return {
      id: addressDoc._id.toString(),
      _id: addressDoc._id,
      name: addressDoc.name,
      fullName: addressDoc.fullName || addressDoc.name,
      address: addressDoc.address,
      city: addressDoc.city,
      state: addressDoc.state,
      zipCode: addressDoc.zipCode,
      country: addressDoc.country,
      phone: addressDoc.phone,
      isDefault: addressDoc.isDefault,
      type: addressDoc.type,
      createdAt: addressDoc.createdAt,
      updatedAt: addressDoc.updatedAt,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an address
 * @param {String} addressId - Address ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Boolean>} True if deleted
 */
export const deleteAddress = async (addressId, userId) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const firstAddress = await Address.findOne({ userId }).sort({ createdAt: 1 });
      if (firstAddress) {
        firstAddress.isDefault = true;
        await firstAddress.save();
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Set address as default
 * @param {String} addressId - Address ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Updated address
 */
export const setDefaultAddress = async (addressId, userId) => {
  try {
    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // Unset other defaults
    await Address.updateMany(
      { userId, _id: { $ne: addressId }, isDefault: true },
      { isDefault: false }
    );

    // Set this as default
    address.isDefault = true;
    await address.save();

    return {
      id: address._id.toString(),
      _id: address._id,
      name: address.name,
      fullName: address.fullName || address.name,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      type: address.type,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  } catch (error) {
    throw error;
  }
};

