import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attribute from '../models/Attribute.model.js';
import AttributeValue from '../models/AttributeValue.model.js';
import AttributeSet from '../models/AttributeSet.model.js';
import connectDB from '../config/database.js';

// Load environment variables
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Comprehensive attribute data
const attributesData = [
  {
    name: 'Size',
    type: 'select',
    required: true,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734', '6954da0fa4d9ccee08c9c78b', '6954da3ea4d9ccee08c9c79b'],
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', 'UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'US 4', 'US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13']
  },
  {
    name: 'Color',
    type: 'select',
    required: true,
    status: 'active',
    categoryIds: [], // All categories
    values: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Gray', 'Brown', 'Pink', 'Purple', 'Orange', 'Navy', 'Maroon', 'Beige', 'Khaki', 'Olive', 'Teal', 'Cyan', 'Magenta', 'Gold', 'Silver', 'Bronze', 'Ivory', 'Cream', 'Tan', 'Peach', 'Coral', 'Lavender', 'Mint', 'Turquoise']
  },
  {
    name: 'Material',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [], // All categories
    values: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Linen', 'Denim', 'Leather', 'Synthetic', 'Bamboo', 'Rayon', 'Spandex', 'Nylon', 'Cashmere', 'Chiffon', 'Georgette', 'Jersey', 'Satin', 'Velvet', 'Corduroy', 'Twill', 'Canvas', 'Mesh', 'Fleece', 'Terry', 'Tulle', 'Organza', 'Crepe', 'Poplin', 'Muslin', 'Taffeta', 'Leather', 'Suede', 'Synthetic Leather', 'Canvas', 'Rubber', 'Mesh', 'Knit']
  },
  {
    name: 'Brand',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [], // All categories
    values: ['Zara', 'Forever 21', 'Puma', 'Levi\'s', 'Tommy Hilfiger', 'Fabindia', 'Biba', 'Manyavar', 'Allen Solly', 'Pantaloons', 'Nike', 'Adidas', 'H&M', 'Uniqlo', 'Gap', 'Bata', 'Woodland', 'Red Tape', 'Liberty', 'Metro', 'Mochi', 'Skechers', 'Reebok', 'New Balance', 'Converse']
  },
  {
    name: 'Style',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734'],
    values: ['Casual', 'Formal', 'Sporty', 'Vintage', 'Modern', 'Classic', 'Bohemian', 'Minimalist', 'Streetwear', 'Ethnic', 'Western', 'Fusion', 'Traditional', 'Contemporary', 'Retro']
  },
  {
    name: 'Pattern',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Solid', 'Striped', 'Polka Dot', 'Floral', 'Geometric', 'Abstract', 'Plaid', 'Checkered', 'Paisley', 'Animal Print', 'Tie-Dye', 'Embroidered', 'Printed', 'Woven', 'Knit']
  },
  {
    name: 'Sleeve Length',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Sleeveless', 'Short Sleeve', 'Three-Quarter Sleeve', 'Long Sleeve', 'Cap Sleeve', 'Raglan Sleeve', 'Bell Sleeve', 'Puff Sleeve']
  },
  {
    name: 'Neck Type',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Round Neck', 'V-Neck', 'Collar', 'Hooded', 'Turtle Neck', 'Crew Neck', 'Boat Neck', 'Off Shoulder', 'Halter Neck', 'Square Neck']
  },
  {
    name: 'Fit',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Regular Fit', 'Slim Fit', 'Loose Fit', 'Oversized', 'Skinny Fit', 'Relaxed Fit', 'Tapered Fit', 'Straight Fit']
  },
  {
    name: 'Waist Type',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['High Waist', 'Mid Waist', 'Low Waist', 'Elastic Waist', 'Drawstring Waist', 'Zip Waist']
  },
  {
    name: 'Length',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Short', 'Regular', 'Long', 'Extra Long', 'Knee Length', 'Ankle Length', 'Floor Length']
  },
  {
    name: 'Season',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['Spring', 'Summer', 'Monsoon', 'Winter', 'All Season']
  },
  {
    name: 'Care Instructions',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['Machine Wash', 'Hand Wash', 'Dry Clean Only', 'Do Not Wash', 'Cold Wash', 'Warm Wash', 'Bleach', 'Do Not Bleach', 'Tumble Dry', 'Line Dry', 'Do Not Dry']
  },
  {
    name: 'Warranty Period',
    type: 'number',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['1', '2', '3', '6', '12', '18', '24', '36']
  },
  {
    name: 'Country of Origin',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['India', 'China', 'Bangladesh', 'USA', 'UK', 'Italy', 'France', 'Germany', 'Japan', 'South Korea', 'Thailand', 'Vietnam', 'Turkey', 'Spain', 'Portugal']
  },
  {
    name: 'Gender',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734'],
    values: ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids']
  },
  {
    name: 'Age Group',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['Infant (0-2)', 'Toddler (2-4)', 'Kids (4-8)', 'Pre-Teen (8-12)', 'Teen (12-16)', 'Adult (16+)', 'Senior (60+)']
  },
  {
    name: 'Occasion',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734'],
    values: ['Casual', 'Party', 'Wedding', 'Festival', 'Office', 'Sports', 'Travel', 'Beach', 'Formal Event', 'Date Night', 'Everyday Wear']
  },
  {
    name: 'Fabric Weight',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Light', 'Medium', 'Heavy', 'Ultra Light', 'Ultra Heavy']
  },
  {
    name: 'Stretch',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Yes', 'No']
  },
  {
    name: 'Waterproof',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734'],
    values: ['Yes', 'No']
  },
  {
    name: 'Breathable',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f', '6954d888a4d9ccee08c9c71b', '6954d8fda4d9ccee08c9c734'],
    values: ['Yes', 'No']
  },
  {
    name: 'UV Protection',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Yes', 'No']
  },
  {
    name: 'Wrinkle Free',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Yes', 'No']
  },
  {
    name: 'Stain Resistant',
    type: 'boolean',
    required: false,
    status: 'active',
    categoryIds: ['695225c0d0e906cc1323b2d9', '6952268cd0e906cc1323b311', '695226b0d0e906cc1323b31f'],
    values: ['Yes', 'No']
  },
  {
    name: 'Packaging Type',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['Box', 'Polybag', 'Hanger', 'Vacuum Pack', 'Gift Box', 'Eco-Friendly Pack']
  },
  {
    name: 'Certification',
    type: 'select',
    required: false,
    status: 'active',
    categoryIds: [],
    values: ['Organic', 'Fair Trade', 'OEKO-TEX', 'GOTS', 'ISO Certified', 'BIS Certified', 'FSC Certified', 'No Certification']
  }
];

// Attribute Sets - Groups of related attributes
const attributeSetsData = [
  {
    name: 'Clothing Essentials',
    attributes: ['Size', 'Color', 'Material', 'Style', 'Fit', 'Gender'],
    status: 'active'
  },
  {
    name: 'Apparel Details',
    attributes: ['Size', 'Color', 'Material', 'Pattern', 'Sleeve Length', 'Neck Type', 'Fit', 'Length'],
    status: 'active'
  },
  {
    name: 'Product Information',
    attributes: ['Brand', 'Country of Origin', 'Season', 'Care Instructions', 'Warranty Period'],
    status: 'active'
  },
  {
    name: 'Fabric Properties',
    attributes: ['Material', 'Fabric Weight', 'Stretch', 'Breathable', 'Waterproof', 'UV Protection', 'Wrinkle Free', 'Stain Resistant'],
    status: 'active'
  },
  {
    name: 'Complete Set',
    attributes: ['Size', 'Color', 'Material', 'Brand', 'Style', 'Pattern', 'Fit', 'Gender', 'Age Group', 'Occasion'],
    status: 'active'
  },
  {
    name: 'Kids Clothing',
    attributes: ['Size', 'Color', 'Material', 'Age Group', 'Gender', 'Care Instructions', 'Stretch'],
    status: 'active'
  },
  {
    name: 'Outdoor Wear',
    attributes: ['Size', 'Color', 'Material', 'Waterproof', 'Breathable', 'UV Protection', 'Season'],
    status: 'active'
  },
  {
    name: 'Formal Wear',
    attributes: ['Size', 'Color', 'Material', 'Style', 'Fit', 'Occasion', 'Care Instructions'],
    status: 'active'
  }
];

/**
 * Seed attributes, attribute values, and attribute sets
 */
const seedAttributes = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected successfully');

    console.log(`\n📦 Starting to seed attributes and values...\n`);

    let createdAttributes = 0;
    let skippedAttributes = 0;
    let createdValues = 0;
    let skippedValues = 0;
    let createdSets = 0;
    let skippedSets = 0;
    let errorCount = 0;

    const attributeMap = {}; // Store attribute IDs for later use

    // Step 1: Create Attributes
    console.log('📝 Step 1: Creating Attributes...\n');
    for (const attrData of attributesData) {
      try {
        // Check if attribute already exists
        const existingAttr = await Attribute.findOne({ 
          name: { $regex: new RegExp(`^${attrData.name}$`, 'i') } 
        });

        if (existingAttr) {
          // Update existing attribute with new categoryIds if provided
          existingAttr.categoryIds = attrData.categoryIds || [];
          existingAttr.required = attrData.required;
          existingAttr.type = attrData.type;
          existingAttr.status = attrData.status;
          await existingAttr.save();
          
          console.log(`✅ Updated Attribute: "${attrData.name}" (with ${existingAttr.categoryIds.length} categories)`);
          skippedAttributes++; // Still count as skipped/processed
          attributeMap[attrData.name] = existingAttr._id;
          continue;
        }

        // Create attribute
        const attribute = await Attribute.create({
          name: attrData.name,
          type: attrData.type,
          required: attrData.required,
          status: attrData.status,
          categoryIds: attrData.categoryIds || [],
        });

        console.log(`✅ Created Attribute: "${attribute.name}" (ID: ${attribute._id})`);
        createdAttributes++;
        attributeMap[attrData.name] = attribute._id;
      } catch (error) {
        if (error.code === 11000 || error.message.includes('duplicate')) {
          console.log(`⏭️  Skipped Attribute: "${attrData.name}" (duplicate)`);
          skippedAttributes++;
        } else {
          console.error(`❌ Error creating attribute "${attrData.name}":`, error.message);
          errorCount++;
        }
      }
    }

    // Step 2: Create Attribute Values
    console.log(`\n📝 Step 2: Creating Attribute Values...\n`);
    for (const attrData of attributesData) {
      const attributeId = attributeMap[attrData.name];
      if (!attributeId) {
        console.log(`⚠️  Skipping values for "${attrData.name}" - attribute not found`);
        continue;
      }

      if (!attrData.values || attrData.values.length === 0) {
        continue;
      }

      for (let i = 0; i < attrData.values.length; i++) {
        const value = attrData.values[i];
        try {
          // Check if value already exists for this attribute
          const existingValue = await AttributeValue.findOne({
            attributeId: attributeId,
            value: { $regex: new RegExp(`^${value}$`, 'i') }
          });

          if (existingValue) {
            skippedValues++;
            continue;
          }

          // Create attribute value
          const attributeValue = await AttributeValue.create({
            attributeId: attributeId,
            value: value,
            displayOrder: i + 1,
            status: 'active',
          });

          createdValues++;
        } catch (error) {
          if (error.code === 11000 || error.message.includes('duplicate')) {
            skippedValues++;
          } else {
            console.error(`❌ Error creating value "${value}" for "${attrData.name}":`, error.message);
            errorCount++;
          }
        }
      }
      console.log(`✅ Created ${attrData.values.length} values for "${attrData.name}"`);
    }

    // Step 3: Create Attribute Sets
    console.log(`\n📝 Step 3: Creating Attribute Sets...\n`);
    for (const setData of attributeSetsData) {
      try {
        // Check if attribute set already exists
        const existingSet = await AttributeSet.findOne({ 
          name: { $regex: new RegExp(`^${setData.name}$`, 'i') } 
        });

        if (existingSet) {
          console.log(`⏭️  Skipped Attribute Set: "${setData.name}" (already exists)`);
          skippedSets++;
          continue;
        }

        // Convert attribute names to IDs
        const attributeIds = setData.attributes
          .map(attrName => {
            const attrId = attributeMap[attrName];
            if (!attrId) {
              console.log(`⚠️  Warning: Attribute "${attrName}" not found for set "${setData.name}"`);
            }
            return attrId ? attrId.toString() : null;
          })
          .filter(id => id !== null);

        if (attributeIds.length === 0) {
          console.log(`⚠️  Skipped Attribute Set: "${setData.name}" (no valid attributes)`);
          skippedSets++;
          continue;
        }

        // Create attribute set
        const attributeSet = await AttributeSet.create({
          name: setData.name,
          attributes: attributeIds,
          status: setData.status,
        });

        console.log(`✅ Created Attribute Set: "${attributeSet.name}" with ${attributeIds.length} attributes`);
        createdSets++;
      } catch (error) {
        if (error.code === 11000 || error.message.includes('duplicate')) {
          console.log(`⏭️  Skipped Attribute Set: "${setData.name}" (duplicate)`);
          skippedSets++;
        } else {
          console.error(`❌ Error creating attribute set "${setData.name}":`, error.message);
          errorCount++;
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Seeding Summary:');
    console.log('='.repeat(60));
    console.log('Attributes:');
    console.log(`   ✅ Created: ${createdAttributes}`);
    console.log(`   ⏭️  Skipped: ${skippedAttributes}`);
    console.log('\nAttribute Values:');
    console.log(`   ✅ Created: ${createdValues}`);
    console.log(`   ⏭️  Skipped: ${skippedValues}`);
    console.log('\nAttribute Sets:');
    console.log(`   ✅ Created: ${createdSets}`);
    console.log(`   ⏭️  Skipped: ${skippedSets}`);
    console.log(`\n   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Get totals
    const totalAttributes = await Attribute.countDocuments();
    const totalValues = await AttributeValue.countDocuments();
    const totalSets = await AttributeSet.countDocuments();
    
    console.log(`📈 Database Totals:`);
    console.log(`   Attributes: ${totalAttributes}`);
    console.log(`   Attribute Values: ${totalValues}`);
    console.log(`   Attribute Sets: ${totalSets}\n`);

    console.log('✅ Attribute seeding completed successfully!');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding attributes:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedAttributes();

