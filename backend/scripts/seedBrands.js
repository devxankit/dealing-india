import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Brand from '../models/Brand.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to brands folder
const brandsPath = path.join(__dirname, '../../frontend/src/assets/brands');

/**
 * Get all brand folders
 */
const getBrandFolders = () => {
  try {
    if (!fs.existsSync(brandsPath)) {
      console.error(`❌ Brands path does not exist: ${brandsPath}`);
      return [];
    }

    const items = fs.readdirSync(brandsPath, { withFileTypes: true });
    const folders = items
      .filter(item => item.isDirectory())
      .map(item => item.name);

    console.log(`📁 Found ${folders.length} brand folders:`, folders);
    return folders;
  } catch (error) {
    console.error('❌ Error reading brands directory:', error.message);
    return [];
  }
};

/**
 * Get all image files from a brand folder
 */
const getBrandImages = (brandFolder) => {
  try {
    const brandPath = path.join(brandsPath, brandFolder);
    const items = fs.readdirSync(brandPath);

    // Filter for image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const images = items.filter(item => {
      const ext = path.extname(item).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`🖼️  Found ${images.length} images in ${brandFolder}:`, images);
    return images.map(image => path.join(brandPath, image));
  } catch (error) {
    console.error(`❌ Error reading images from ${brandFolder}:`, error.message);
    return [];
  }
};

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (imagePath, brandName) => {
  try {
    console.log(`⬆️  Uploading ${path.basename(imagePath)} for brand: ${brandName}`);

    const buffer = fs.readFileSync(imagePath);
    const result = await uploadToCloudinary(buffer, `brands/${brandName.toLowerCase().replace(/\s+/g, '-')}`);

    console.log(`✅ Successfully uploaded ${path.basename(imagePath)}:`, result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Failed to upload ${path.basename(imagePath)}:`, error.message);
    return null;
  }
};

/**
 * Create brand in database
 */
const createBrand = async (brandName, logoUrl) => {
  try {
    console.log(`💾 Creating brand: ${brandName}`);

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ name: brandName });
    if (existingBrand) {
      console.log(`⚠️  Brand "${brandName}" already exists, updating logo...`);
      existingBrand.logo = logoUrl || existingBrand.logo;
      await existingBrand.save();
      return existingBrand;
    }

    // Create new brand
    const brand = await Brand.create({
      name: brandName,
      logo: logoUrl,
      description: `Premium ${brandName} brand offering quality products`,
      website: '',
      isActive: true
    });

    console.log(`✅ Created brand: ${brandName} with ID: ${brand._id}`);
    return brand;
  } catch (error) {
    console.error(`❌ Failed to create brand "${brandName}":`, error.message);
    return null;
  }
};

/**
 * Process a single brand folder
 */
const processBrandFolder = async (brandFolder) => {
  console.log(`\n🔄 Processing brand folder: ${brandFolder}`);

  try {
    // Get images for this brand
    const imagePaths = getBrandImages(brandFolder);

    if (imagePaths.length === 0) {
      console.log(`⚠️  No images found in ${brandFolder}, skipping...`);
      return;
    }

    // Upload the first image as logo (or you can choose logic for selecting logo)
    const logoImagePath = imagePaths[0];
    const logoUrl = await uploadImage(logoImagePath, brandFolder);

    if (!logoUrl) {
      console.log(`❌ Failed to upload logo for ${brandFolder}, skipping brand creation...`);
      return;
    }

    // Upload additional images if needed (you can modify this logic)
    // For now, we'll just use the first image as logo

    // Create brand in database
    const brand = await createBrand(brandFolder, logoUrl);

    if (brand) {
      console.log(`🎉 Successfully processed brand: ${brandFolder}`);
    }
  } catch (error) {
    console.error(`❌ Error processing brand folder ${brandFolder}:`, error.message);
  }
};

/**
 * Main function to seed brands
 */
const seedBrands = async () => {
  try {
    console.log('🚀 Starting brand seeding process...\n');

    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all brand folders
    const brandFolders = getBrandFolders();

    if (brandFolders.length === 0) {
      console.log('❌ No brand folders found. Please ensure brands are in frontend/src/assets/brands/');
      return;
    }

    console.log(`\n📋 Processing ${brandFolders.length} brand(s)...\n`);

    // Process each brand folder
    for (const brandFolder of brandFolders) {
      await processBrandFolder(brandFolder);

      // Add a small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎊 Brand seeding completed successfully!');

    // Get final count
    const totalBrands = await Brand.countDocuments();
    console.log(`📊 Total brands in database: ${totalBrands}`);

  } catch (error) {
    console.error('❌ Brand seeding failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
seedBrands();
