# Automated SKU Generation System

This document describes the automated Stock Keeping Unit (SKU) generation system implemented for vendor products.

## Overview

To simplify the product creation process for vendors, manual SKU entry has been removed from the vendor interface. The system now automatically generates unique, consistent, and meaningful SKUs based on product and vendor information.

## Generation Logic

The SKU is generated using the following pattern:
`[PREFIX]-[VENDOR_SUFFIX]-[TIMESTAMP]`

### 1. Prefix (3 characters)
- Derived from the first 3 characters of the **Product Name**.
- Converted to uppercase.
- Any non-alphanumeric characters are replaced with 'X'.
- *Example: "iPhone 15" -> "IPH"*

### 2. Vendor Suffix (4 characters)
- Derived from the last 4 characters of the **Vendor's Database ID**.
- Ensures that different vendors selling the same product name will have different SKUs.
- *Example: "65a1234567890abcdef1234" -> "E1234"*

### 3. Timestamp (6 characters)
- Derived from the last 6 digits of the current Unix timestamp.
- Provides a temporal uniqueness factor.

### 4. Uniqueness Handling (Collision Resolution)
If the generated SKU already exists in the database, the system automatically appends a counter:
`[PREFIX]-[VENDOR_SUFFIX]-[TIMESTAMP]-[COUNTER]`

The system iterates and increments the counter until a truly unique SKU is found.

## Implementation Details

### Backend Logic
The logic is encapsulated in the `generateSKU` function within `backend/services/vendorProducts.service.js`.

```javascript
const generateSKU = async (name, vendorId) => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const vendorSuffix = vendorId.toString().slice(-4).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  let generatedSku = `${prefix}-${vendorSuffix}-${timestamp}`;
  
  // Ensure uniqueness
  let isUnique = false;
  let counter = 0;
  while (!isUnique) {
    const existing = await Product.findOne({ sku: generatedSku });
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      generatedSku = `${prefix}-${vendorSuffix}-${timestamp}-${counter}`;
    }
  }
  return generatedSku;
};
```

### Frontend Integration
- **Vendor Forms**: SKU input fields have been removed from `AddProduct.jsx` and `ProductForm.jsx` in the vendor module.
- **Admin Forms**: Admin interfaces retain the ability to view/edit SKUs if necessary for management, but are encouraged to let the system handle generation.

## Backward Compatibility

- **Existing Products**: Products with manually entered SKUs are preserved. The system will only generate a new SKU if the field is missing or explicitly cleared during an update.
- **Product Name Changes**: To maintain consistency, the system will automatically regenerate the SKU if the product name is updated. This ensures the SKU prefix always matches the current product name.
- **Manual Overrides**: The backend service still accepts a `sku` field in the request payload. If provided, it validates uniqueness and uses the provided SKU instead of generating one. This allows for legacy support and administrative overrides.

## Benefits
1. **Zero Vendor Effort**: Vendors no longer need to think of or manage SKU naming conventions.
2. **Consistency**: All new products follow a standardized naming pattern.
3. **Collision Prevention**: Built-in uniqueness checks prevent database errors and inventory confusion.
4. **Traceability**: SKUs contain encoded information about the product name and vendor.
