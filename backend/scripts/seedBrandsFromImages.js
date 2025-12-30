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
 * Get all image files from brands folder
 */
const getBrandImages = () => {
  try {
    if (!fs.existsSync(brandsPath)) {
      console.error(`❌ Brands path does not exist: ${brandsPath}`);
      return [];
    }

    const items = fs.readdirSync(brandsPath);

    // Filter for image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const images = items.filter(item => {
      const ext = path.extname(item).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`🖼️  Found ${images.length} brand images:`, images);
    return images.map(image => ({
      filename: image,
      filepath: path.join(brandsPath, image)
    }));
  } catch (error) {
    console.error('❌ Error reading brands directory:', error.message);
    return [];
  }
};

/**
 * Generate brand name from filename
 */
const generateBrandName = (filename) => {
  // Remove file extension
  let name = path.parse(filename).name;

  // Clean up filename - remove common prefixes/suffixes
  name = name
    .replace(/^images\s*\(\d+\)$/, '') // Remove "images (1)", "images (2)", etc.
    .replace(/^images$/, '') // Remove just "images"
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // If name is empty after cleaning, use original filename without extension
  if (!name) {
    name = path.parse(filename).name;
  }

  // Capitalize first letter of each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
 * Process a single brand image
 */
const processBrandImage = async (imageInfo) => {
  console.log(`\n🔄 Processing brand image: ${imageInfo.filename}`);

  try {
    // Generate brand name from filename
    const brandName = generateBrandName(imageInfo.filename);
    console.log(`🏷️  Generated brand name: "${brandName}"`);

    // Upload image
    const logoUrl = await uploadImage(imageInfo.filepath, brandName);

    if (!logoUrl) {
      console.log(`❌ Failed to upload logo for ${imageInfo.filename}, skipping brand creation...`);
      return;
    }

    // Create brand in database
    const brand = await createBrand(brandName, logoUrl);

    if (brand) {
      console.log(`🎉 Successfully processed brand: ${brandName}`);
    }
  } catch (error) {
    console.error(`❌ Error processing brand image ${imageInfo.filename}:`, error.message);
  }
};

/**
 * Main function to seed brands from images
 */
const seedBrandsFromImages = async () => {
  try {
    console.log('🚀 Starting brand seeding from images process...\n');

    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all brand images
    const brandImages = getBrandImages();

    if (brandImages.length === 0) {
      console.log('❌ No brand images found. Please ensure brand images are in frontend/src/assets/brands/');
      return;
    }

    console.log(`\n📋 Processing ${brandImages.length} brand image(s)...\n`);

    // Process each brand image
    for (const imageInfo of brandImages) {
      await processBrandImage(imageInfo);

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
seedBrandsFromImages();
