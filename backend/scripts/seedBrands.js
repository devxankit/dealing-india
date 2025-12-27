import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Brand from '../models/Brand.model.js';
import connectDB from '../config/database.js';

// Load environment variables
dotenv.config();

// Mock brand data (from frontend/src/data/brands.js)
const mockBrands = [
  {
    name: "Zara",
    logo: "data/brands/zara.png",
    description: "Spanish fast fashion retailer",
    website: "https://www.zara.com",
    isActive: true,
  },
  {
    name: "Forever 21",
    logo: "data/brands/forever 21.png",
    description: "American fast fashion retailer",
    website: "https://www.forever21.com",
    isActive: true,
  },
  {
    name: "Puma",
    logo: "data/brands/puma.png",
    description: "German multinational corporation that designs and manufactures athletic and casual footwear",
    website: "https://www.puma.com",
    isActive: true,
  },
  {
    name: "Levi's",
    logo: "data/brands/levi's.png",
    description: "American clothing company known worldwide for its Levi's brand of denim jeans",
    website: "https://www.levi.com",
    isActive: true,
  },
  {
    name: "Tommy Hilfiger",
    logo: "data/brands/Tommy hilfiger.png",
    description: "American premium lifestyle brand",
    website: "https://www.tommy.com",
    isActive: true,
  },
  {
    name: "Fabindia",
    logo: "data/brands/fabindia.png",
    description: "Indian chain store retailing garments, home furnishings, fabrics and ethnic products",
    website: "https://www.fabindia.com",
    isActive: true,
  },
  {
    name: "Biba",
    logo: "data/brands/biba.png",
    description: "Indian women's ethnic wear brand",
    website: "https://www.biba.in",
    isActive: true,
  },
  {
    name: "Manyavar",
    logo: "data/brands/manyavar.png",
    description: "Indian ethnic wear brand specializing in men's wedding and festive wear",
    website: "https://www.manyavar.com",
    isActive: true,
  },
  {
    name: "Allen Solly",
    logo: "data/brands/allen solly.png",
    description: "British-origin Indian clothing brand",
    website: "https://www.allensolly.com",
    isActive: true,
  },
  {
    name: "Pantaloons",
    logo: "data/brands/pantaloons.png",
    description: "Indian retail chain of fashion stores",
    website: "https://www.pantaloons.com",
    isActive: true,
  },
];

/**
 * Seed brands into database
 */
const seedBrands = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected successfully');

    console.log(`\n📦 Starting to seed ${mockBrands.length} brands...\n`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const brandData of mockBrands) {
      try {
        // Check if brand already exists
        const existingBrand = await Brand.findOne({ 
          name: { $regex: new RegExp(`^${brandData.name}$`, 'i') } 
        });

        if (existingBrand) {
          console.log(`⏭️  Skipped: "${brandData.name}" (already exists)`);
          skippedCount++;
          continue;
        }

        // Create brand
        const brand = await Brand.create(brandData);
        console.log(`✅ Created: "${brand.name}" (ID: ${brand._id})`);
        createdCount++;
      } catch (error) {
        if (error.code === 11000 || error.message.includes('duplicate')) {
          console.log(`⏭️  Skipped: "${brandData.name}" (duplicate)`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating "${brandData.name}":`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Created: ${createdCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    // Get total brands count
    const totalBrands = await Brand.countDocuments();
    console.log(`📈 Total brands in database: ${totalBrands}\n`);

    console.log('✅ Brand seeding completed successfully!');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding brands:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedBrands();

