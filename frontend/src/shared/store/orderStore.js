import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCommissionStore } from './commissionStore';

export const useOrderStore = create(
  persist(
    (set, get) => ({
      orders: [],

      // Create a new order
      createOrder: (orderData) => {
        const orderId = `ORD-${Date.now()}`;
        const trackingNumber = `TRK${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        
        // Calculate estimated delivery (5-7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 5);
        
        // Group items by vendor and calculate vendor-specific totals
        const vendorItems = orderData.vendorItems || [];
        
        // If vendorItems not provided, calculate from items
        let calculatedVendorItems = [];
        if (vendorItems.length === 0 && orderData.items) {
          // Group items by vendor
          const vendorGroups = {};
          orderData.items.forEach((item) => {
            const vendorId = item.vendorId || 1; // Default to vendor 1 if not specified
            const vendorName = item.vendorName || 'Unknown Vendor';
            
            if (!vendorGroups[vendorId]) {
              vendorGroups[vendorId] = {
                vendorId,
                vendorName,
                items: [],
                subtotal: 0,
                shipping: 0,
                tax: 0,
                discount: 0,
              };
            }
            
            const itemSubtotal = item.price * item.quantity;
            vendorGroups[vendorId].items.push(item);
            vendorGroups[vendorId].subtotal += itemSubtotal;
          });
          
          // Calculate shipping per vendor (split equally or by subtotal ratio)
          const totalSubtotal = Object.values(vendorGroups).reduce((sum, v) => sum + v.subtotal, 0);
          const shippingPerVendor = orderData.shipping / Object.keys(vendorGroups).length;
          
          calculatedVendorItems = Object.values(vendorGroups).map((vendorGroup) => ({
            ...vendorGroup,
            shipping: shippingPerVendor,
            tax: (vendorGroup.subtotal * (orderData.tax || 0)) / (totalSubtotal || 1),
            discount: (vendorGroup.subtotal * (orderData.discount || 0)) / (totalSubtotal || 1),
          }));
        } else {
          calculatedVendorItems = vendorItems;
        }
        
        const newOrder = {
          id: orderId,
          userId: orderData.userId || null,
          date: new Date().toISOString(),
          status: 'pending',
          items: orderData.items || [],
          vendorItems: calculatedVendorItems, // Track items grouped by vendor
          shippingAddress: orderData.shippingAddress || {},
          paymentMethod: orderData.paymentMethod || 'card',
          subtotal: orderData.subtotal || 0,
          shipping: orderData.shipping || 0,
          tax: orderData.tax || 0,
          discount: orderData.discount || 0,
          total: orderData.total || 0,
          couponCode: orderData.couponCode || null,
          trackingNumber: trackingNumber,
          estimatedDelivery: estimatedDelivery.toISOString(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        // Record commissions for this order
        if (calculatedVendorItems.length > 0) {
          useCommissionStore.getState().recordCommission(orderId, calculatedVendorItems);
        }

        return newOrder;
      },

      // Get a single order by ID
      getOrder: (orderId) => {
        const state = get();
        return state.orders.find((order) => order.id === orderId);
      },

      // Get all orders for a user (or guest orders if userId is null)
      getAllOrders: (userId = null) => {
        const state = get();
        if (userId === null) {
          // Return guest orders (where userId is null)
          return state.orders.filter((order) => order.userId === null);
        }
        return state.orders.filter((order) => order.userId === userId);
      },

      // Get orders for a specific vendor
      getVendorOrders: (vendorId) => {
        const state = get();
        return state.orders.filter((order) => {
          if (!order.vendorItems) return false;
          return order.vendorItems.some((vi) => vi.vendorId === parseInt(vendorId));
        });
      },

      // Get order items for a specific vendor from an order
      getVendorOrderItems: (orderId, vendorId) => {
        const order = get().getOrder(orderId);
        if (!order || !order.vendorItems) return null;
        
        const vendorItem = order.vendorItems.find((vi) => vi.vendorId === parseInt(vendorId));
        return vendorItem || null;
      },

      // Update order status
      updateOrderStatus: (orderId, newStatus) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          ),
        }));
      },

      // Cancel an order
      cancelOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status: 'cancelled' } : order
          ),
        }));
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

