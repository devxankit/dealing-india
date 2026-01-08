import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCommissionStore } from './commissionStore';
import * as orderService from '../services/orderService';

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

      // API Methods for backend integration

      // Create order via API
      createOrderAPI: async (orderData) => {
        try {
          const response = await orderService.createOrder(orderData);
          const order = response.order;

          // For online payments, order may be null (created after payment verification)
          if (!order) {
            // Return razorpay details and pending order data for verification step
            return {
              order: null,
              razorpay: response.razorpay,
              pendingOrderData: response.pendingOrderData,
            };
          }

          // Store order locally for backward compatibility (COD/wallet-only orders)
          const newOrder = {
            id: order.id || order.orderCode,
            orderCode: order.orderCode,
            userId: orderData.userId || null,
            date: order.createdAt || new Date().toISOString(),
            status: order.status,
            items: orderData.items || [],
            shippingAddress: orderData.shippingAddress || {},
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            subtotal: orderData.subtotal || 0,
            shipping: orderData.shipping || 0,
            tax: orderData.tax || 0,
            discount: orderData.discount || 0,
            total: order.total,
            couponCode: orderData.couponCode || null,
            razorpay: response.razorpay,
          };

          set((state) => ({
            orders: [newOrder, ...state.orders],
          }));

          return {
            order: newOrder,
            razorpay: response.razorpay,
          };
        } catch (error) {
          console.error('Error creating order via API:', error);
          throw error;
        }
      },

      // Verify payment via API (also creates order for online payments in new flow)
      verifyPaymentAPI: async (orderId, paymentData) => {
        try {
          const response = await orderService.verifyPayment(orderId, paymentData);
          const order = response.order;

          // Add or update local order
          set((state) => {
            const existingIndex = state.orders.findIndex(
              (o) => o.id === order.id || o.orderCode === order.orderCode
            );

            const formattedOrder = {
              id: order.id || order._id || order.orderCode,
              orderCode: order.orderCode,
              status: order.status,
              paymentStatus: order.paymentStatus,
              total: order.total,
            };

            if (existingIndex >= 0) {
              const updated = [...state.orders];
              updated[existingIndex] = { ...updated[existingIndex], ...formattedOrder };
              return { orders: updated };
            } else {
              // New order - add to list
              return { orders: [formattedOrder, ...state.orders] };
            }
          });

          return response;
        } catch (error) {
          console.error('Error verifying payment:', error);
          throw error;
        }
      },

      // Fetch order by ID from API
      fetchOrderById: async (orderId) => {
        try {
          const response = await orderService.getOrderById(orderId);
          const order = response.order;

          // Update or add order to local storage
          set((state) => {
            const existingIndex = state.orders.findIndex(
              (o) => o.id === orderId || o.orderCode === order.orderCode
            );

            const formattedOrder = {
              id: order._id || order.orderCode,
              orderCode: order.orderCode,
              userId: order.customerId?._id || order.customerId,
              date: order.orderDate || order.createdAt,
              status: order.status,
              paymentStatus: order.paymentStatus,
              items: order.items || [],
              shippingAddress: order.shippingAddress || {},
              paymentMethod: order.paymentMethod,
              total: order.total,
            };

            if (existingIndex >= 0) {
              const updated = [...state.orders];
              updated[existingIndex] = formattedOrder;
              return { orders: updated };
            } else {
              return { orders: [formattedOrder, ...state.orders] };
            }
          });

          return response;
        } catch (error) {
          console.error('Error fetching order:', error);
          throw error;
        }
      },

      // Fetch user orders from API
      fetchUserOrders: async (filters = {}) => {
        try {
          const response = await orderService.getUserOrders(filters);
          const orders = response.orders || [];

          // Update local orders
          set((state) => {
            const existingIds = new Set(state.orders.map((o) => o.id || o.orderCode));
            const newOrders = orders
              .filter((o) => !existingIds.has(o._id) && !existingIds.has(o.orderCode))
              .map((order) => ({
                id: order._id || order.orderCode,
                orderCode: order.orderCode,
                userId: order.customerId?._id || order.customerId,
                date: order.orderDate || order.createdAt,
                status: order.status,
                paymentStatus: order.paymentStatus,
                items: order.items || [],
                shippingAddress: order.shippingAddress || {},
                paymentMethod: order.paymentMethod,
                total: order.total,
              }));

            return { orders: [...newOrders, ...state.orders] };
          });

          return response;
        } catch (error) {
          console.error('Error fetching orders:', error);
          throw error;
        }
      },

      // Cancel order via API
      cancelOrderAPI: async (orderId) => {
        try {
          const response = await orderService.cancelOrder(orderId);

          // Update local order
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId || order.orderCode === response.order.orderCode
                ? { ...order, status: 'cancelled' }
                : order
            ),
          }));

          return response;
        } catch (error) {
          console.error('Error cancelling order:', error);
          throw error;
        }
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

