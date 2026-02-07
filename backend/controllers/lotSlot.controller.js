import LotSlot from '../models/LotSlot.model.js';
import Vendor from '../models/Vendor.model.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { uploadBase64ToCloudinary, deleteMultipleFromCloudinary } from '../utils/cloudinary.util.js';

/**
 * Helper to generate SKU for Lot/Slot
 */
const generateLotSlotSKU = async (name, vendorId) => {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'L');
    const vendorSuffix = vendorId.toString().slice(-4).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    let generatedSku = `LS-${prefix}-${vendorSuffix}-${timestamp}`;

    let isUnique = false;
    while (!isUnique) {
        const existing = await LotSlot.findOne({ sku: generatedSku });
        if (!existing) isUnique = true;
        else generatedSku = `LS-${prefix}-${vendorSuffix}-${Date.now().toString().slice(-6)}`;
    }
    return generatedSku;
};

/**
 * Get all Lot/Slots for a vendor
 */
export const getLotSlots = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const { search = '', page = 1, limit = 10 } = req.query;

    const query = { vendorId, isActive: true };
    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    const total = await LotSlot.countDocuments(query);
    const lotSlots = await LotSlot.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        data: {
            lotSlots,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Create Lot/Slot listing
 */
export const createLotSlot = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendorId;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor || vendor.vendorType !== 'b2b') {
        return res.status(403).json({ success: false, message: 'Only B2B vendors can list lots/slots' });
    }

    const { images = [], name, price, moq } = req.body;

    if (!name || !price || !moq) {
        return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // Handle Images
    let imageUrl = null;
    let imagePublicId = null;
    const imageUrls = [];
    const imagePublicIds = [];

    if (images && images.length > 0) {
        // Upload images one by one (first one is cover)
        for (let i = 0; i < images.length; i++) {
            if (images[i].startsWith('data:image')) {
                const result = await uploadBase64ToCloudinary(images[i], 'lotslots');
                if (i === 0) {
                    imageUrl = result.secure_url;
                    imagePublicId = result.public_id;
                } else {
                    imageUrls.push(result.secure_url);
                    imagePublicIds.push(result.public_id);
                }
            }
        }
    }

    const sku = await generateLotSlotSKU(name, vendorId);

    const lotSlot = await LotSlot.create({
        ...req.body,
        vendorId,
        sku,
        image: imageUrl,
        imagePublicId,
        images: imageUrls,
        imagePublicIds: imagePublicIds,
        isActive: true
    });

    res.status(201).json({
        success: true,
        message: 'Lot/Slot listing published successfully',
        data: lotSlot
    });
});

/**
 * Update Lot/Slot
 */
export const updateLotSlot = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const vendorId = req.user.vendorId;

    const existingLotSlot = await LotSlot.findOne({ _id: id, vendorId });
    if (!existingLotSlot) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    const { images = [] } = req.body;

    // Simple image handling for update:
    // If images are provided as base64, they are new. If as URL, they are existing.
    // In this simplified version, let's just handle new base64 ones.

    // Create a map of existing images for easy lookup
    const existingImagesMap = new Map();
    if (existingLotSlot.image) {
        existingImagesMap.set(existingLotSlot.image, existingLotSlot.imagePublicId);
    }
    if (existingLotSlot.images && existingLotSlot.images.length > 0) {
        existingLotSlot.images.forEach((url, idx) => {
            if (url) existingImagesMap.set(url, existingLotSlot.imagePublicIds[idx]);
        });
    }

    let imageUrl = null;
    let imagePublicId = null;
    const imageUrls = [];
    const imagePublicIds = [];

    if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img.startsWith('data:image')) {
                const result = await uploadBase64ToCloudinary(img, 'lotslots');
                if (i === 0) {
                    imageUrl = result.secure_url;
                    imagePublicId = result.public_id;
                } else {
                    imageUrls.push(result.secure_url);
                    imagePublicIds.push(result.public_id);
                }
            } else if (img.startsWith('http')) {
                // It's an existing image, find its public ID
                const pid = existingImagesMap.get(img);
                if (i === 0) {
                    imageUrl = img;
                    imagePublicId = pid || null;
                } else {
                    imageUrls.push(img);
                    imagePublicIds.push(pid || null);
                }
            }
        }
    }

    // Identfy images to delete from Cloudinary
    const newUsedPublicIds = new Set();
    if (imagePublicId) newUsedPublicIds.add(imagePublicId);
    imagePublicIds.forEach(pid => { if (pid) newUsedPublicIds.add(pid); });

    const pidsToDelete = [];
    if (existingLotSlot.imagePublicId && !newUsedPublicIds.has(existingLotSlot.imagePublicId)) {
        pidsToDelete.push(existingLotSlot.imagePublicId);
    }
    if (existingLotSlot.imagePublicIds) {
        existingLotSlot.imagePublicIds.forEach(pid => {
            if (pid && !newUsedPublicIds.has(pid)) {
                pidsToDelete.push(pid);
            }
        });
    }

    if (pidsToDelete.length > 0) {
        try {
            await deleteMultipleFromCloudinary(pidsToDelete);
        } catch (err) {
            console.error('Failed to delete old images:', err);
        }
    }

    // Generate SKU if missing (for legacy items)
    let sku = existingLotSlot.sku;
    if (!sku) {
        sku = await generateLotSlotSKU(req.body.name || existingLotSlot.name, vendorId);
    }

    const updatedLotSlot = await LotSlot.findByIdAndUpdate(
        id,
        {
            ...req.body,
            sku,
            image: imageUrl,
            imagePublicId,
            images: imageUrls,
            imagePublicIds: imagePublicIds
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Listing updated successfully',
        data: updatedLotSlot
    });
});

/**
 * Get Lot/Slot By ID
 */
export const getLotSlotById = asyncHandler(async (req, res) => {
    const lotSlot = await LotSlot.findOne({ _id: req.params.id, vendorId: req.user.vendorId });
    if (!lotSlot) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    res.status(200).json({
        success: true,
        data: lotSlot
    });
});

/**
 * Delete Lot/Slot
 */
export const deleteLotSlot = asyncHandler(async (req, res) => {
    const lotSlot = await LotSlot.findOne({ _id: req.params.id, vendorId: req.user.vendorId });
    if (!lotSlot) {
        return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Cleanup images from cloudinary
    const pids = [];
    if (lotSlot.imagePublicId) pids.push(lotSlot.imagePublicId);
    if (lotSlot.imagePublicIds) pids.push(...lotSlot.imagePublicIds);

    if (pids.length > 0) {
        await deleteMultipleFromCloudinary(pids);
    }

    await LotSlot.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Listing deleted successfully'
    });
});
