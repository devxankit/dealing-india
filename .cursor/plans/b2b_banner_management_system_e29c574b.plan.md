---
name: B2B Banner Management System
overview: Create a B2B banner booking and management system similar to the existing hero banner system. B2B vendors can book banners that appear on the B2B catalog page, and admins can approve/reject these bookings through the B2B Vendors section.
todos: []
---

# B2B Banner Management System

## Overview

Create a complete B2B banner booking system following the same pattern as the existing hero banner system. The system includes:

1. **B2B Vendor Banner Booking Page** - Where B2B vendors can book banner slots
2. **Admin B2B Banner Management Page** - Where admins approve/reject B2B vendor banner bookings
3. **Banner Display on B2B Catalog** - Show approved banners at the top of the B2B catalog page

## Implementation Plan

### 1. Admin B2B Banner Management Page

**File:** `frontend/src/modules/Admin/pages/b2b-vendors/B2BBannerManagement.jsx`

- Follow the same structure as `AdminHeroBanner.jsx`
- Display banner slots (similar to hero banner slots)
- Show all B2B vendor banner bookings in a DataTable
- Include approve/reject actions for pending bookings
- Add settings panel for banner configuration
- Use mock data for now (no backend integration)

**Menu Update:** Add "Banner Bookings" to `/admin/b2b-vendors` children in `adminMenu.json`

### 2. B2B Vendor Banner Booking Page

**File:** `frontend/src/modules/B2BVendor/pages/B2BBannerBooking.jsx`

- Follow the same structure as `HeroBannerBooking.jsx`
- Display available banner slots
- Booking modal with form (image upload, date selection, duration, price calculation)
- Show vendor's booking history in DataTable
- Use mock data for now (no backend integration)

**Menu Update:** Add "Banner Booking" to B2B vendor menu in `b2bVendorMenu.json`

### 3. Banner Display Component for B2B Catalog

**File:** `frontend/src/modules/B2BUserApp/components/B2BBanner.jsx`

- Similar to `HeroBanner.jsx` component
- Display approved B2B banners at the top of the catalog page
- Auto-rotate banners with display time
- Click handler to navigate to banner link or vendor page
- Use mock data showing approved banners

**Integration:** Add banner component to `ProductCatalog.jsx` right after the header and before the search bar

### 4. Routing Updates

**File:** `frontend/src/App.jsx`

- Add route for admin B2B banner management: `/admin/b2b-vendors/banner-bookings`
- Add route for B2B vendor banner booking: `/b2b-vendor/banner-booking`

### 5. Sidebar Updates

**File:** `frontend/src/modules/Admin/components/Layout/AdminSidebar.jsx`

- Add route mapping for "Banner Bookings" under `/admin/b2b-vendors`

**File:** `frontend/src/modules/B2BVendor/components/Layout/B2BVendorSidebar.jsx`

- Add icon mapping for "Banner Booking"
- Add route handling for banner booking page

## Mock Data Structure

- Banner slots: 5 slots with different prices
- Banner bookings: Sample bookings with different statuses (pending, approved, active, rejected)
- Settings: Display time, booking window, pricing structure

## Design Consistency

- Follow the exact same UI/UX patterns as the hero banner system
- Use same color scheme, spacing, and component styles
- Maintain responsive design for mobile and desktop
- Use same icons and badges from react-icons/fi

## Notes

- All pages will use mock data initially (no API calls)
- Frontend-only implementation for now
- Banner display on catalog page will show mock approved banners
- No backend changes required at this stage