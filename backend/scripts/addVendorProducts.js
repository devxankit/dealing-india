import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for API
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

// Vendor credentials
const VENDORS = [
  {
    email: 'mrvishupatel28@gmail.com',
    password: 'mrvishu@123'
  },
  {
    email: 'vishalpatel581012@gmail.com',
    password: 'vishu@123'
  }
];

// Helper function to generate product name from filename
const generateProductName = (filename) => {
  return filename
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

// Helper function to determine category from product name
const determineCategory = (name) => {
  const nameLower = name.toLowerCase();
  
  // Footwear
  if (nameLower.includes('shoe') || nameLower.includes('boot') || nameLower.includes('heel') || 
      nameLower.includes('sneaker') || nameLower.includes('athletic')) {
    return {
      category: 'Footwear',
      subcategory: nameLower.includes('boot') ? 'Boots' :
                   nameLower.includes('heel') ? 'Heels' :
                   nameLower.includes('athletic') || nameLower.includes('sport') ? 'Sports Shoes' :
                   'Casual Shoes'
    };
  }
  
  // Accessories
  if (nameLower.includes('watch') || nameLower.includes('sunglass') || nameLower.includes('necklace') || 
      nameLower.includes('neckless') || nameLower.includes('belt') || nameLower.includes('bag') ||
      nameLower.includes('scarf')) {
    return {
      category: 'Accessories',
      subcategory: nameLower.includes('watch') ? 'Watches' :
                   nameLower.includes('sunglass') ? 'Eyewear' :
                   nameLower.includes('necklace') || nameLower.includes('neckless') ? 'Jewelry' :
                   nameLower.includes('belt') ? 'Belts' :
                   nameLower.includes('bag') ? 'Bags' :
                   null // Scarf in main category
    };
  }
  
  // Clothing - Dresses
  if (nameLower.includes('dress') || nameLower.includes('gown') || nameLower.includes('maxi')) {
    return {
      category: 'Clothing',
      subcategory: 'Dresses'
    };
  }
  
  // Clothing - T-Shirts
  if (nameLower.includes('shirt') || nameLower.includes('t-shirt') || nameLower.includes('t shirt')) {
    return {
      category: 'Clothing',
      subcategory: nameLower.includes('t-shirt') || nameLower.includes('t shirt') ? 'T-Shirts' : 'Shirts'
    };
  }
  
  // Clothing - Jeans
  if (nameLower.includes('jean')) {
    return {
      category: 'Clothing',
      subcategory: 'Jeans'
    };
  }
  
  // Clothing - Jackets
  if (nameLower.includes('jacket') || nameLower.includes('blazer')) {
    return {
      category: 'Clothing',
      subcategory: nameLower.includes('blazer') ? 'Formal Wear' : 'Jackets'
    };
  }
  
  // Clothing - Pants
  if (nameLower.includes('pant') || nameLower.includes('track')) {
    return {
      category: 'Clothing',
      subcategory: 'Sports Wear'
    };
  }
  
  // Clothing - Winter
  if (nameLower.includes('sweater') || nameLower.includes('winter')) {
    return {
      category: 'Clothing',
      subcategory: nameLower.includes('scarf') || nameLower.includes('winter') ? null : 'Winter Wear'
    };
  }
  
  // Default
  return {
    category: 'Clothing',
    subcategory: null
  };
};

// Generate price based on category
const generatePrice = (category, subcategory) => {
  let basePrice = 1000;
  
  if (category === 'Footwear') {
    basePrice = 1500 + Math.random() * 2000;
  } else if (category === 'Accessories') {
    if (subcategory === 'Watches') {
      basePrice = 2000 + Math.random() * 3000;
    } else if (subcategory === 'Jewelry') {
      basePrice = 1500 + Math.random() * 2000;
    } else {
      basePrice = 500 + Math.random() * 1500;
    }
  } else if (category === 'Clothing') {
    if (subcategory === 'Formal Wear' || subcategory === 'Dresses') {
      basePrice = 1500 + Math.random() * 2500;
    } else {
      basePrice = 500 + Math.random() * 1500;
    }
  }
  
  const price = Math.round(basePrice);
  const originalPrice = Math.round(price * (1.3 + Math.random() * 0.4)); // 30-70% markup
  
  return { price, originalPrice };
};

// Helper function to convert image to base64
const imageToBase64 = (imagePath) => {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).slice(1);
    return `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${base64}`;
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error.message);
    return null;
  }
};

// Login vendor
const loginVendor = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/vendor/login`, {
      email,
      password
    });
    
    // Check different possible response structures
    const token = response.data?.data?.token || 
                  response.data?.token || 
                  response.data?.accessToken ||
                  response.data?.authToken;
    
    if (token) {
      return token;
    }
    
    // Log response for debugging
    console.log('Login response:', JSON.stringify(response.data, null, 2));
    throw new Error('Login failed: Token not found in response');
  } catch (error) {
    console.error(`Login error for ${email}:`, error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Full response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

// Get all categories
const getCategories = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/categories`, {
      params: { limit: 1000 },
      timeout: 10000 // 10 second timeout
    });
    
    const categories = response.data?.categories || response.data?.data?.categories || [];
    return categories;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Please make sure the backend server is running on', BASE_URL);
      console.error('   Start the server with: npm run dev');
    } else {
      console.error('Error fetching categories:', error.response?.data?.message || error.message);
    }
    throw error;
  }
};

// Find category by name (recursive)
const findCategory = (categories, name, parentId = null) => {
  const filtered = categories.filter(cat => {
    const matchesName = cat.name?.toLowerCase() === name.toLowerCase();
    const matchesParent = parentId ? (cat.parentId?.toString() === parentId.toString()) : !cat.parentId;
    return matchesName && matchesParent;
  });
  
  if (filtered.length > 0) {
    return filtered[0];
  }
  
  // If not found, try to find in children
  for (const cat of categories) {
    if (parentId && cat.parentId?.toString() === parentId.toString()) {
      const found = findCategory(categories, name, cat._id || cat.id);
      if (found) return found;
    }
  }
  
  return null;
};

// Get brands (if needed)
const getBrands = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/vendor/brands`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data?.data?.brands || response.data?.brands || [];
  } catch (error) {
    console.warn('Could not fetch brands, continuing without brand:', error.message);
    return [];
  }
};

// Create product
const createProduct = async (productData, imageBase64, token) => {
  try {
    // Send as JSON with base64 image
    const payload = {
      ...productData,
      image: imageBase64
    };
    
    const response = await axios.post(`${BASE_URL}/vendor/products`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error creating product ${productData.name}:`, error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting product seeding script...\n');
  
  try {
    // Get all categories
    console.log('📂 Fetching categories...');
    const allCategories = await getCategories();
    console.log(`✅ Found ${allCategories.length} categories\n`);
    
    // Get images directory
    const imagesDir = path.join(__dirname, '../../frontend/data/products');
    
    // Read all images from folder
    console.log('📸 Reading images from folder...');
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file));
    
    console.log(`✅ Found ${imageFiles.length} images\n`);
    
    // Generate products from images (30 per vendor = 60 total)
    const PRODUCTS_PER_VENDOR = 30;
    const TOTAL_PRODUCTS = PRODUCTS_PER_VENDOR * VENDORS.length;
    
    // Create product list - use all images and duplicate with variations to reach 60
    const PRODUCTS = [];
    const variations = ['Premium', 'Classic', 'Designer', 'Luxury', 'Elegant', 'Stylish', 'Modern', 'Trendy', 'Fashion', 'Deluxe'];
    const colors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Brown', 'Grey', 'Navy', 'Beige', 'Pink'];
    
    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      const imageIndex = i % imageFiles.length;
      const imageFile = imageFiles[imageIndex];
      const baseName = generateProductName(imageFile);
      
      // Add variation for duplicates
      let productName = baseName;
      if (i >= imageFiles.length) {
        const variation = variations[i % variations.length];
        const color = colors[i % colors.length];
        productName = `${variation} ${color} ${baseName}`;
      }
      
      const categoryInfo = determineCategory(baseName);
      const { price, originalPrice } = generatePrice(categoryInfo.category, categoryInfo.subcategory);
      
      PRODUCTS.push({
        name: productName,
        image: imageFile,
        category: categoryInfo.category,
        subcategory: categoryInfo.subcategory,
        price: price,
        originalPrice: originalPrice
      });
    }
    
    console.log(`📦 Generated ${PRODUCTS.length} products (${PRODUCTS_PER_VENDOR} per vendor)\n`);
    
    // Process each vendor
    for (let vendorIndex = 0; vendorIndex < VENDORS.length; vendorIndex++) {
      const vendor = VENDORS[vendorIndex];
      console.log(`\n👤 Processing Vendor ${vendorIndex + 1}: ${vendor.email}`);
      
      // Login
      console.log('🔐 Logging in...');
      const token = await loginVendor(vendor.email, vendor.password);
      console.log('✅ Logged in successfully');
      
      // Get brands
      const brands = await getBrands(token);
      const defaultBrand = brands.length > 0 ? brands[0]._id || brands[0].id : null;
      
      // Distribute products between vendors (30 per vendor)
      const startIndex = vendorIndex * PRODUCTS_PER_VENDOR;
      const endIndex = startIndex + PRODUCTS_PER_VENDOR;
      const vendorProducts = PRODUCTS.slice(startIndex, endIndex);
      
      console.log(`📦 Adding ${vendorProducts.length} products for this vendor\n`);
      
      // Process each product
      for (let i = 0; i < vendorProducts.length; i++) {
        const product = vendorProducts[i];
        console.log(`\n[${i + 1}/${vendorProducts.length}] Creating: ${product.name}`);
        
        try {
          // Find category
          let categoryId = null;
          let subcategoryId = null;
          let subSubCategoryId = null;
          
          // Find main category
          const mainCategory = findCategory(allCategories, product.category);
          if (mainCategory) {
            categoryId = mainCategory._id || mainCategory.id;
            console.log(`  📁 Main Category: ${product.category} (${categoryId})`);
            
          // Find subcategory
          if (product.subcategory) {
            const subcategory = findCategory(allCategories, product.subcategory, categoryId);
            if (subcategory) {
              subcategoryId = subcategory._id || subcategory.id;
              console.log(`  📁 Subcategory: ${product.subcategory} (${subcategoryId})`);
              
              // Try to find sub-subcategory (if exists) - only for some products
              const subSubCategories = allCategories.filter(cat => 
                cat.parentId?.toString() === subcategoryId.toString()
              );
              if (subSubCategories.length > 0 && Math.random() > 0.6) {
                // 40% chance to use sub-subcategory if available
                subSubCategoryId = subSubCategories[0]._id || subSubCategories[0].id;
                console.log(`  📁 Sub-Subcategory: ${subSubCategories[0].name} (${subSubCategoryId})`);
              } else {
                console.log(`  📁 Using subcategory only (no sub-subcategory)`);
              }
            } else {
              console.log(`  ⚠️  Subcategory "${product.subcategory}" not found, using main category only`);
            }
          } else {
            console.log(`  📁 Using main category only (no subcategory specified)`);
          }
          } else {
            // If category not found, use first available category
            const firstCategory = allCategories.find(cat => !cat.parentId);
            if (firstCategory) {
              categoryId = firstCategory._id || firstCategory.id;
              console.log(`  ⚠️  Category "${product.category}" not found, using: ${firstCategory.name}`);
            } else {
              console.log(`  ❌ No categories available!`);
              continue;
            }
          }
          
          // Read image
          const imagePath = path.join(imagesDir, product.image);
          if (!fs.existsSync(imagePath)) {
            console.log(`  ⚠️  Image not found: ${product.image}`);
            continue;
          }
          
          const imageBase64 = imageToBase64(imagePath);
          if (!imageBase64) {
            console.log(`  ❌ Failed to read image: ${product.image}`);
            continue;
          }
          
          // Generate SKU
          const sku = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          
          // Prepare product data
          const productData = {
            name: product.name,
            sku: sku,
            description: `High quality ${product.name.toLowerCase()}. Premium materials and excellent craftsmanship.`,
            price: product.price,
            originalPrice: product.originalPrice || product.price * 1.5,
            unit: 'piece',
            categoryId: categoryId,
            subcategoryId: subcategoryId || null,
            subSubCategoryId: subSubCategoryId || null,
            brandId: defaultBrand,
            stock: 'in_stock',
            stockQuantity: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
            isVisible: true,
            isActive: true,
            codAllowed: true,
            returnable: true,
            cancelable: true,
            taxIncluded: false,
            hasSizes: false,
            productType: 'simple',
            isNew: Math.random() > 0.7, // 30% chance
            isTrending: Math.random() > 0.8, // 20% chance
            isFeatured: Math.random() > 0.9, // 10% chance
            minimumOrderQuantity: 1,
            totalAllowedQuantity: null,
            warrantyPeriod: '1 year',
            guaranteePeriod: '6 months',
            hsnCode: `HSN${Math.floor(Math.random() * 9000) + 1000}`,
            tags: [product.category.toLowerCase(), product.subcategory?.toLowerCase() || 'general'].filter(Boolean)
          };
          
          // Create product
          const result = await createProduct(productData, imageBase64, token);
          
          if (result.success) {
            console.log(`  ✅ Product created successfully!`);
          } else {
            console.log(`  ⚠️  Product creation returned: ${result.message}`);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.response?.data?.message || error.message}`);
          continue;
        }
      }
      
      console.log(`\n✅ Completed processing for vendor: ${vendor.email}`);
    }
    
    console.log('\n🎉 Product seeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the script
main();

