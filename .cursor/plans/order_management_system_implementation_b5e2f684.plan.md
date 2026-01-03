---
name: Order Management System Implementation
overview: Complete Order Management System implementation for User, Vendor, and Admin apps with full backend-frontend integration, replacing all mock data with real database-driven operations.
todos: []
---

# Complete Order Management System Implementation Plan

## Phase 1: Frontend Analysis Summary

### User App (`frontend/src/modules/UserApp/`)

- **Orders.jsx**: Lists user orders with status filters (pending, processing, shipped, delivered, cancelled)
- **OrderDetail.jsx**: Shows order details, items grouped by vendor, shipping address, payment info, cancel/reorder actions
- **Status**: Partially connected - uses `fetchUserOrders` API but also relies on orderStore
- **Expected Data**: orderCode, status, items, vendorItems, shippingAddress, paymentMethod, paymentStatus, totals

### Vendor App (`frontend/src/modules/Vendor/`)

- **Orders.jsx**: Dashboard with stats (total, pending, processing, shipped, delivered, cancelled)
- **AllOrders.jsx**: Order listing with search, status filters, vendor-specific filtering
- **OrderDetail.jsx**: Order details with status update dropdown, vendor-specific items only
- **Status**: Uses orderStore with vendor filtering - **COMPLETELY MOCK DATA**
- **Expected Data**: Orders filtered by vendorId, vendorItems array, status update capability
- **Status Options**: pending, processing, shipped, delivered, cancelled, on_hold, ready_to_ship, dispatched, shipped_seller

### Admin App (`frontend/src/modules/Admin/`)

- **Orders.jsx**: Dashboard with stats and navigation cards
- **AllOrders.jsx**: Full order listing with search, date filters, status filters
- **OrderDetail.jsx**: Complete order view with editable status, customer info, timeline
- **OrderTracking.jsx**: Order tracking view
- **Status**: Uses `mockOrders` from `adminMockData.js` - **COMPLETELY MOCK DATA**
- **Expected Data**: All orders, advanced filters, analytics-ready structure

### Key Findings:

1. Order model missing: pricing breakdown (subtotal, tax, discount, shipping stored but not properly structured)
2. Order model missing: status history/timeline
3. Order model missing: vendor snapshots, user snapshots
4. Order model missing: cancellation reason, refund info
5. No vendor order APIs (controller/routes)
6. No admin order APIs (controller/routes)
7. Frontend expects `vendorItems` array structure for multi-vendor orders
8. Status transitions need role-based validation

## Phase 2: Order Data Flow & Lifecycle

### Order Lifecycle Diagram

```javascript
PLACED (by User)
    ↓
PENDING (payment pending for COD/online)
    ↓
PROCESSING (payment confirmed, vendor preparing)
    ↓
READY_TO_SHIP (vendor ready)
    ↓
DISPATCHED / SHIPPED (vendor dispatched)
    ↓
DELIVERED (completed)

Alternative paths:
- PENDING → CANCELLED (by user before processing)
- PROCESSING → CANCELLED (by user or vendor)
- Any status → REFUNDED (if cancelled after payment)
```



### Status Enums

- **User-facing**: PLACED, PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
- **Vendor-specific**: ON_HOLD, READY_TO_SHIP, DISPATCHED, SHIPPED_SELLER
- **Payment**: PENDING, COMPLETED, FAILED, REFUNDED

### Data Flow

1. **Order Creation**: User → Cart → Checkout → Order API → Database
2. **Vendor View**: Database → Vendor Orders API → Filter by vendorId → Transform to vendorItems
3. **Admin View**: Database → Admin Orders API → All orders with filters
4. **Status Updates**: 

- User: Can cancel (pending/processing only)
- Vendor: Can update status (processing → ready_to_ship → dispatched → shipped_seller)
- Admin: Can update any status

### Ownership Rules

- **User**: Sees own orders only
- **Vendor**: Sees orders containing their products only
- **Admin**: Sees all orders
- **Status Updates**: Role-based (see Phase 4)

## Phase 3: Database Schema Design

### Enhanced Order Schema

**File**: `backend/models/Order.model.js`**New Fields to Add:**

```javascript
{
  // Pricing breakdown (denormalized for performance)
  pricing: {
    subtotal: Number,
    tax: Number,
    discount: Number,
    shipping: Number,
    total: Number,
    couponCode: String,
  },
  
  // Customer snapshot (denormalized)
  customerSnapshot: {
    name: String,
    email: String,
    phone: String,
  },
  
  // Status history with timestamps
  statusHistory: [{
    status: String,
    changedBy: { type: ObjectId, ref: 'User/Vendor/Admin' },
    changedByRole: String, // 'user', 'vendor', 'admin'
    timestamp: Date,
    note: String,
  }],
  
  // Cancellation info
  cancellation: {
    cancelledAt: Date,
    cancelledBy: { type: ObjectId },
    cancelledByRole: String,
    reason: String,
    refundStatus: String, // 'pending', 'processing', 'completed', 'failed'
    refundAmount: Number,
    refundTransactionId: String,
  },
  
  // Tracking info
  tracking: {
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
  },
  
  // Vendor breakdown (for multi-vendor orders)
  vendorBreakdown: [{
    vendorId: { type: ObjectId, ref: 'Vendor' },
    vendorName: String,
    subtotal: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    commission: Number,
  }],
}
```

**Existing fields to enhance:**

- `status`: Add enums (pending, processing, ready_to_ship, dispatched, shipped_seller, delivered, cancelled, refunded, on_hold)
- Keep existing: orderCode, customerId, items, paymentMethod, paymentStatus, shippingAddress, razorpay fields

**Indexes to add:**

- `{ status: 1, createdAt: -1 }`
- `{ 'vendorBreakdown.vendorId': 1, status: 1 }`
- `{ orderCode: 1 }` (already unique)

### Validation Rules

- Status transitions must be valid (see Phase 4)
- Pricing totals must match (subtotal + tax + shipping - discount = total)
- vendorBreakdown totals should sum to order totals

## Phase 4: Backend Implementation

### 4.1 Update Order Model

**File**: `backend/models/Order.model.js`

- Add new schema fields from Phase 3
- Update status enum
- Add indexes
- Add validation methods

### 4.2 Update Order Service

**File**: `backend/services/order.service.js`**Enhance existing functions:**

- `createOrder`: Store pricing breakdown, customer snapshot, initial status history
- `updateOrderPayment`: Add status history entry
- `getOrderById`: Populate vendorBreakdown, statusHistory
- `getUserOrders`: Add vendorBreakdown to response
- `cancelOrder`: Store cancellation info, add status history

**New functions:**

- `updateOrderStatus(orderId, newStatus, changedBy, changedByRole, note)`: Validate transition, update status, add history
- `getVendorOrders(vendorId, filters)`: Use existing vendorOrders.service.js logic
- `getAdminOrders(filters)`: Get all orders with advanced filters
- `validateStatusTransition(currentStatus, newStatus, role)`: Role-based validation

### 4.3 Create Vendor Order Controller

**File**: `backend/controllers/vendor-controllers/vendorOrder.controller.js`**Endpoints:**

- `GET /api/vendor/orders`: Get vendor orders (use vendorOrders.service.js)
- `GET /api/vendor/orders/:orderId`: Get vendor-specific order details
- `PUT /api/vendor/orders/:orderId/status`: Update order status (vendor role)
- `GET /api/vendor/orders/stats`: Get vendor order statistics

**Validation:**

- Vendor can only see orders with their products
- Vendor can update: processing → ready_to_ship → dispatched → shipped_seller
- Vendor cannot cancel (only user/admin)

### 4.4 Create Admin Order Controller

**File**: `backend/controllers/admin-controllers/orderManagement.controller.js`**Endpoints:**

- `GET /api/admin/orders`: Get all orders with filters (status, date range, customer, vendor, search)
- `GET /api/admin/orders/:orderId`: Get order details
- `PUT /api/admin/orders/:orderId/status`: Update order status (admin - any status)
- `GET /api/admin/orders/stats`: Get order statistics/analytics
- `PUT /api/admin/orders/:orderId/cancel`: Admin cancellation
- `PUT /api/admin/orders/:orderId/refund`: Process refund

### 4.5 Create Routes

**File**: `backend/routes/vendorOrder.routes.js`

- Mount at `/api/vendor/orders` in server.js
- Use vendor authentication middleware
- Use role middleware (vendor)

**File**: `backend/routes/adminOrder.routes.js`

- Mount at `/api/admin/orders` in server.js
- Use admin authentication middleware
- Use role middleware (admin)

### 4.6 Status Transition Rules

**User:**

- Can cancel: pending, processing
- Cannot update to other statuses

**Vendor:**

- Can update: processing → ready_to_ship → dispatched → shipped_seller
- Can set: on_hold (from processing)
- Cannot cancel

**Admin:**

- Can update to any status
- Can cancel any order
- Can process refunds

## Phase 5: Frontend Integration

### 5.1 User App Updates

**File**: `frontend/src/modules/UserApp/pages/Orders.jsx`

- Remove orderStore dependency for listing
- Use `fetchUserOrders` API only
- Add loading states, error handling
- Remove mock data usage

**File**: `frontend/src/modules/UserApp/pages/OrderDetail.jsx`

- Use `fetchOrderById` API
- Update cancel order to use `cancelOrderAPI`
- Remove orderStore dependency
- Handle vendorItems display properly

**File**: `frontend/src/shared/services/orderService.js`

- Already exists, verify all methods work correctly

### 5.2 Vendor App Updates

**File**: `frontend/src/shared/services/orderService.js`

- Add vendor order methods:
- `getVendorOrders(filters)`
- `getVendorOrderById(orderId)`
- `updateVendorOrderStatus(orderId, status)`
- `getVendorOrderStats()`

**File**: `frontend/src/modules/Vendor/pages/Orders.jsx`

- Replace orderStore with API calls
- Fetch vendor orders on mount
- Update stats calculation from API response

**File**: `frontend/src/modules/Vendor/pages/orders/AllOrders.jsx`

- Replace orderStore filtering with API calls
- Add API integration for search, filters
- Remove mock data

**File**: `frontend/src/modules/Vendor/pages/orders/OrderDetail.jsx`

- Fetch order from API
- Implement status update API call
- Remove orderStore dependency
- Show only vendor-specific items

### 5.3 Admin App Updates

**File**: `frontend/src/shared/services/orderService.js`

- Add admin order methods:
- `getAdminOrders(filters)`
- `getAdminOrderById(orderId)`
- `updateAdminOrderStatus(orderId, status)`
- `cancelAdminOrder(orderId, reason)`
- `processRefund(orderId, amount)`
- `getAdminOrderStats()`

**File**: `frontend/src/modules/Admin/pages/Orders.jsx`

- Remove mockOrders import
- Fetch orders from API
- Update stats from API

**File**: `frontend/src/modules/Admin/pages/orders/AllOrders.jsx`

- Remove localStorage and mockOrders
- Integrate API for listing, search, filters
- Add date range filtering

**File**: `frontend/src/modules/Admin/pages/OrderDetail.jsx`

- Remove mockOrders and localStorage
- Fetch order from API
- Implement status update API
- Show complete order details

**File**: `frontend/src/modules/Admin/pages/orders/OrderTracking.jsx`

- Remove mockOrders
- Fetch orders from API
- Display tracking info from order.tracking

### 5.4 Remove Mock Data

**File**: `frontend/src/data/adminMockData.js`

- Keep mockOrders export (may be used elsewhere temporarily)
- Document that it's deprecated

**Files to clean:**

- All Admin order pages (remove mockOrders imports)
- All Vendor order pages (remove orderStore mock usage)
- Verify no localStorage usage for orders

## Phase 6: Testing & Verification Checklist

### Backend

- [ ] Order creation stores all required fields
- [ ] Vendor orders API returns only vendor's orders
- [ ] Admin orders API returns all orders
- [ ] Status transitions validate correctly per role
- [ ] Pricing breakdown is stored and returned
- [ ] Status history is maintained
- [ ] Cancellation stores proper info
- [ ] Vendor breakdown is calculated correctly

### Frontend

- [ ] User orders page shows real data
- [ ] User order detail shows correct info
- [ ] Vendor orders page shows vendor's orders only
- [ ] Vendor can update order status
- [ ] Admin orders page shows all orders
- [ ] Admin can update order status
- [ ] No mock data in any order pages
- [ ] Loading states work correctly
- [ ] Error handling works
- [ ] Empty states display properly

### Integration

- [ ] Same order visible correctly to User, Vendor, Admin
- [ ] Status changes reflect everywhere
- [ ] Cancel order works from user side
- [ ] Vendor status updates visible to user/admin
- [ ] Admin status updates visible to user/vendor

## Implementation Order

1. **Database Schema** (Phase 3) - Update Order model
2. **Backend Services** (Phase 4.2) - Enhance order.service.js
3. **Backend Controllers** (Phase 4.3, 4.4) - Create vendor/admin controllers
4. **Backend Routes** (Phase 4.5) - Create and mount routes
5. **User App Integration** (Phase 5.1) - Already partially done, complete it
6. **Vendor App Integration** (Phase 5.2) - Replace all mock data
7. **Admin App Integration** (Phase 5.3) - Replace all mock data
8. **Cleanup** (Phase 5.4) - Remove mock data usage
9. **Testing** (Phase 6) - Verify all functionality

## Important Notes

- **Backward Compatibility**: New schema fields should be optional initially (default values)
- **Data Migration**: Existing orders won't have new fields - handle gracefully
- **Performance**: vendorBreakdown calculation can be expensive - consider caching