import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Category from '../models/Category.model.js';
import Brand from '../models/Brand.model.js';
import Vendor from '../models/Vendor.model.js';
import { createVendorProduct } from '../services/vendorProducts.service.js';

// Mock data
let testVendor;
let testCategory;
let testBrand;

describe('Product Management', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dealing-india-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up and create test data
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Vendor.deleteMany({});

    // Create test vendor
    testVendor = await Vendor.create({
      email: 'test@vendor.com',
      password: 'hashedpassword',
      businessName: 'Test Vendor',
      storeName: 'Test Store',
    });

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      isActive: true,
    });

    // Create test brand
    testBrand = await Brand.create({
      name: 'Test Brand',
      isActive: true,
    });
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Vendor.deleteMany({});
  });

  describe('Product Creation', () => {
    it('should create a product with basic information', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
        brandId: testBrand._id,
        description: 'Test description',
      };

      const product = await createVendorProduct(productData, testVendor._id);

      expect(product).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('TEST-001');
      expect(product.price).toBe(29.99);
      expect(product.stockQuantity).toBe(100);
      expect(product.vendorId.toString()).toBe(testVendor._id.toString());
    });

    it('should create a product with color variations', async () => {
      const productData = {
        name: 'Test Product with Variations',
        price: 29.99,
        stockQuantity: 0, // Will be calculated from variants
        categoryId: testCategory._id,
        variants: {
          colorVariants: [
            {
              colorName: 'Red',
              colorCode: '#FF0000',
              sizeVariants: [
                {
                  size: 'S',
                  price: 29.99,
                  stockQuantity: 10,
                },
                {
                  size: 'M',
                  price: 29.99,
                  stockQuantity: 15,
                },
              ],
            },
          ],
        },
      };

      const product = await createVendorProduct(productData, testVendor._id);

      expect(product).toBeDefined();
      expect(product.variants.colorVariants).toHaveLength(1);
      expect(product.variants.colorVariants[0].colorName).toBe('Red');
      expect(product.variants.colorVariants[0].sizeVariants).toHaveLength(2);
      expect(product.stockQuantity).toBe(25); // 10 + 15
    });

    it('should validate SKU uniqueness', async () => {
      const productData1 = {
        name: 'Product 1',
        sku: 'UNIQUE-SKU',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
      };

      const productData2 = {
        name: 'Product 2',
        sku: 'UNIQUE-SKU', // Duplicate SKU
        price: 39.99,
        stockQuantity: 50,
        categoryId: testCategory._id,
      };

      await createVendorProduct(productData1, testVendor._id);

      await expect(
        createVendorProduct(productData2, testVendor._id)
      ).rejects.toThrow('SKU already exists');
    });

    it('should auto-uppercase SKU', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'test-sku-001',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
      };

      const product = await createVendorProduct(productData, testVendor._id);

      expect(product.sku).toBe('TEST-SKU-001');
    });

    it('should validate required fields', async () => {
      const productData = {
        // Missing name, price, stockQuantity
        categoryId: testCategory._id,
      };

      await expect(
        createVendorProduct(productData, testVendor._id)
      ).rejects.toThrow();
    });

    it('should validate pricing consistency', async () => {
      const productData = {
        name: 'Test Product',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
        variants: {
          colorVariants: [
            {
              colorName: 'Red',
              sizeVariants: [
                {
                  size: 'S',
                  price: 29.99,
                  originalPrice: 25.99, // Invalid: originalPrice < price
                  stockQuantity: 10,
                },
              ],
            },
          ],
        },
      };

      // This should be caught by validation
      await expect(
        createVendorProduct(productData, testVendor._id)
      ).rejects.toThrow('Original price');
    });
  });

  describe('Product Validation', () => {
    it('should validate color variant completeness', async () => {
      const productData = {
        name: 'Test Product',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
        variants: {
          colorVariants: [
            {
              colorName: '', // Missing color name
              sizeVariants: [],
            },
          ],
        },
      };

      await expect(
        createVendorProduct(productData, testVendor._id)
      ).rejects.toThrow();
    });

    it('should validate size variant completeness', async () => {
      const productData = {
        name: 'Test Product',
        price: 29.99,
        stockQuantity: 100,
        categoryId: testCategory._id,
        variants: {
          colorVariants: [
            {
              colorName: 'Red',
              sizeVariants: [
                {
                  size: '', // Missing size
                  stockQuantity: 10,
                },
              ],
            },
          ],
        },
      };

      await expect(
        createVendorProduct(productData, testVendor._id)
      ).rejects.toThrow();
    });
  });
});







