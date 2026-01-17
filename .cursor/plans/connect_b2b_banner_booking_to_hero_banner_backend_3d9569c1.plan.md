---
name: Connect B2B Banner Booking to Hero Banner Backend
overview: Connect Admin Panel and B2B Vendor Panel Banner Booking pages to the existing Hero Banner Management backend. Integrate vendor wallet for payments, remove mock data, and maintain all existing frontend UI without any changes.
todos:
  - id: create-b2b-banner-service
    content: Create frontend service file b2bBannerService.js with API wrapper functions for B2B vendor banner operations
    status: completed
  - id: backend-wallet-integration
    content: Add wallet payment support in heroBanner.service.js createBooking() function - check balance, deduct amount, create transaction
    status: completed
  - id: backend-controller-payment-method
    content: Update vendor heroBanner controller to accept and pass paymentMethod parameter to service
    status: completed
    dependencies:
      - backend-wallet-integration
  - id: admin-page-api-integration
    content: Replace mock data in B2BBannerManagement.jsx with real API calls (loadData, handleUpdateSlotFull, handleApproveBanner, handleRejectBanner)
    status: completed
  - id: b2b-vendor-page-api-integration
    content: Replace mock data in B2BBannerBooking.jsx with real API calls (loadData, handleSubmit) using b2bBannerService
    status: completed
    dependencies:
      - create-b2b-banner-service
  - id: frontend-wallet-check
    content: Add wallet balance check before booking creation in B2B vendor page when paymentMethod is wallet
    status: completed
    dependencies:
      - b2b-vendor-page-api-integration
  - id: remove-mock-data-admin
    content: Remove all mock data constants (mockSlots, mockBookings) and mock setTimeout calls from B2BBannerManagement.jsx
    status: completed
    dependencies:
      - admin-page-api-integration
  - id: remove-mock-data-vendor
    content: Remove all mock data constants (mockSlots, mockBookings) and mock setTimeout calls from B2BBannerBooking.jsx
    status: completed
    dependencies:
      - b2b-vendor-page-api-integration
---

# Connect B2B Banner Booking to Hero Banner Backend

## Overview

The Admin B2B Banner Management and B2B Vendor Banner Booking pages currently use mock data. This plan connects them to the existing Hero Banner backend (which already handles both B2C and B2B vendors via the `Vendor` model with `vendorType` field).

## Architecture Analysis

**Existing Backend (Reusable):**

- Models: `BannerSlot.model.js`, `BannerBooking.model.js` (references `Vendor` model)
- Services: `heroBanner.service.js` (handles booking creation, payment, approval)
- Controllers: `admin-controllers/heroBanner.controller.js`, `vendor-controllers/heroBanner.controller.js`
- Routes: `/api/admin/hero-banners/*`, `/api/vendor/hero-banners/*`
- Wallet: `vendorWallet.service.js` for vendor wallet operations

**Frontend Pages (Need Connection):**

- Admin: `frontend/src/modules/Admin/pages/b2b-vendors/B2BBannerManagement.jsx` (uses mock data)
- B2B Vendor: `frontend/src/modules/B2BVendor/pages/B2BBannerBooking.jsx` (uses mock data)

**Key Insight:** B2B vendors use the same `Vendor` model with `vendorType: 'b2b'`, so existing Hero Banner backend APIs work for B2B vendors without modification.

## Implementation Plan

### 1. Create B2B Banner Service Layer (Frontend)

**File:** `frontend/src/modules/B2BVendor/services/b2bBannerService.js` (NEW)

Create a service file similar to `heroBannerService.js` that wraps the existing `/api/vendor/hero-banners/*` endpoints. This keeps the API layer consistent and allows B2B-specific customizations if needed later.

Functions to implement:

- `getAvailableBannerSlots()` - calls `/api/vendor/hero-banners/slots`
- `createBannerBooking(formData)` - calls `/api/vendor/hero-banners/book` with FormData
- `getMyBannerBookings()` - calls `/api/vendor/hero-banners/my-bookings`
- `confirmBannerPayment(paymentData)` - calls `/api/vendor/hero-banners/confirm-payment`
- `cancelBannerBooking(bookingId)` - calls `/api/vendor/hero-banners/bookings/:bookingId` DELETE

### 2. Integrate Wallet Payment in Backend

**File:** `backend/services/heroBanner.service.js`

Modify `createBooking()` function to:

- Accept `paymentMethod` parameter (optional, default 'razorpay')
- If `paymentMethod === 'wallet'`, check vendor wallet balance using `vendorWallet.service.js`
- If sufficient balance, deduct amount and create wallet transaction
- Store transaction reference in `BannerBooking.paymentId`
- Set `paymentStatus: 'paid'` if wallet payment succeeds

**File:** `backend/controllers/vendor-controllers/heroBanner.controller.js`

Update `createBannerBooking()` to:

- Accept `paymentMethod` from request body
- Pass `paymentMethod` to `heroBannerService.createBooking()`
- Handle wallet payment errors appropriately

### 3. Connect Admin B2B Banner Management Page

**File:** `frontend/src/modules/Admin/pages/b2b-vendors/B2BBannerManagement.jsx`

Replace mock data with real API calls:

- `loadData()`: Replace `setTimeout` mock with `getAdminBannerSlots()` and `getAdminBannerBookings()` from `heroBannerService.js`
- `handleUpdateSlotFull()`: Replace local state update with `updateBannerSlot()` API call
- `handleApproveBanner()`: Replace local state update with `approveBannerBooking()` API call
- `handleRejectBanner()`: Replace local state update with `rejectBannerBooking()` API call
- Settings panel: Replace mock with `updateBannerSettings()` API call
- Remove `mockSlots` and `mockBookings` constants completely

**Note:** Use existing `heroBannerService.js` functions from `frontend/src/modules/Vendor/services/heroBannerService.js` since Admin panel already has access to these utilities.

### 4. Connect B2B Vendor Banner Booking Page

**File:** `frontend/src/modules/B2BVendor/pages/B2BBannerBooking.jsx`

Replace mock data with real API calls using the new `b2bBannerService.js`:

- `loadData()`: Call `getAvailableBannerSlots()` and `getMyBannerBookings()`
- `handleSubmit()`: Replace mock booking with `createBannerBooking()` using FormData
  - Convert `formData.image` to File object in FormData
  - Send `durationDays` (backend converts to `durationHours`)
  - Include `paymentMethod: 'wallet'` or `'razorpay'` based on user selection
- Remove `mockSlots` and `mockBookings` constants completely

**Wallet Integration (Frontend):**

- Before calling `createBannerBooking()`, if `paymentMethod === 'wallet'`:
  - Check vendor wallet balance via existing vendor wallet API/store
  - Show error if insufficient balance
  - If sufficient, proceed with booking creation (backend handles wallet deduction)

### 5. Backend Wallet Integration Details

**File:** `backend/services/heroBanner.service.js`

In `createBooking()` function, add wallet payment logic after booking creation:

```javascript
// If wallet payment method
if (paymentMethod === 'wallet' && vendorId) {
  const vendorWalletService = await import('./vendorWallet.service.js');
  const VendorWalletService = vendorWalletService.default;
  const walletService = new VendorWalletService();
  
  // Check balance
  const wallet = await walletService.getOrCreateWallet(vendorId);
  if (wallet.balance < amountNum) {
    throw new Error('Insufficient wallet balance');
  }
  
  // Deduct from wallet
  const walletResult = await walletService.debitPendingOrBalance(
    vendorId,
    amountNum,
    `Banner Booking Payment - ${referenceId}`,
    booking._id.toString(),
    'banner_booking'
  );
  
  // Update booking payment status
  booking.paymentStatus = 'paid';
  booking.paymentMethod = 'wallet';
  booking.paymentId = walletResult._id; // Store wallet transaction ID
  await booking.save();
}
```

### 6. Data Flow

```
B2B Vendor Booking Flow:
1. Vendor selects slot → Frontend calls getAvailableBannerSlots()
2. Vendor fills form → Frontend creates FormData
3. If wallet payment → Frontend checks balance
4. Frontend calls createBannerBooking() → Backend creates booking
5. Backend deducts wallet (if wallet payment) → Creates wallet transaction
6. Booking status: 'pending' (admin approval required)
7. Admin approves → Status changes to 'active'
8. Banner appears in User App via getActiveBanners() API

Admin Management Flow:
1. Admin opens page → Frontend calls getAdminBannerSlots() and getAdminBannerBookings()
2. Admin approves/rejects → Frontend calls approveBannerBooking()/rejectBannerBooking()
3. Backend updates booking status and slot.currentBooking
4. Active banners automatically visible to User App
```

### 7. Mock Data Removal Checklist

**Admin Page (`B2BBannerManagement.jsx`):**

- Remove `mockSlots` constant (line ~27)
- Remove `mockBookings` constant (line ~45)
- Remove mock `setTimeout` in `loadData()` (line ~129)
- Replace all local state updates with API calls

**B2B Vendor Page (`B2BBannerBooking.jsx`):**

- Remove `mockSlots` constant (line ~21)
- Remove `mockBookings` constant (line ~35)
- Remove mock `setTimeout` in `loadData()` (line ~94)
- Replace mock booking creation in `handleSubmit()` (line ~214) with API call

### 8. Error Handling

- Wrap all API calls in try-catch blocks
- Show toast notifications for success/error
- Handle wallet insufficient balance errors gracefully
- Handle booking conflict errors (slot already booked)
- Handle image upload failures

### 9. Testing Checklist

- Admin can view all B2B vendor banner bookings
- Admin can approve/reject bookings
- B2B vendor can view available slots
- B2B vendor can create booking with wallet payment
- B2B vendor can create booking with Razorpay payment
- Wallet balance is checked before booking
- Wallet is deducted on successful booking
- Transaction record is created in wallet
- Approved banners appear in User App
- No frontend UI changes visible to users

## Files to Modify

**Backend:**

1. `backend/services/heroBanner.service.js` - Add wallet payment support
2. `backend/controllers/vendor-controllers/heroBanner.controller.js` - Accept paymentMethod parameter

**Frontend:**

1. `frontend/src/modules/B2BVendor/services/b2bBannerService.js` - NEW file
2. `frontend/src/modules/Admin/pages/b2b-vendors/B2BBannerManagement.jsx` - Replace mock data with API calls
3. `frontend/src/modules/B2BVendor/pages/B2BBannerBooking.jsx` - Replace mock data with API calls

**No Changes Required:**

- Frontend UI components (cards, modals, layouts)
- Existing Hero Banner backend models/routes (already compatible)
- User App banner display (already uses `getActiveBanners()` API)