import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import MobileOrderCard from '../components/Mobile/MobileOrderCard';
import { getUserOrders } from '../../../shared/services/orderService';
import { useAuthStore } from '../../../shared/store/authStore';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import usePullToRefresh from '../hooks/usePullToRefresh';
import toast from 'react-hot-toast';

const MobileOrders = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Fetch orders from backend on mount and when user/status changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadOrders();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, selectedStatus]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getUserOrders({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        page: 1,
        limit: 1000,
      });

      // orderService returns the data object directly (unwrapped)
      if (data?.orders) {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders; // Already filtered by API
  }, [orders]);

  const handleRefresh = async () => {
    if (isAuthenticated && user?.id) {
      try {
        const data = await getUserOrders({
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          page: 1,
          limit: 1000,
        });

        if (data?.orders) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        } else {
          setOrders([]); // Fallback if format is unexpected
        }
        toast.success('Orders refreshed');
      } catch (error) {
        // toast.error('Failed to refresh orders'); 
        // Suppress error toast to avoid spamming if network is flaky on pull-refresh
        console.error('Failed to refresh orders', error);
      }
    }
  };

  const {
    pullDistance,
    isPulling,
    isRefreshing,
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(handleRefresh);

  return (
    <ProtectedRoute>
      <PageTransition>
        <MobileLayout showBottomNav={true} showCartBar={true}>
          <div className="w-full pb-24">
            {/* Header */}
            <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-1 z-30">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="text-xl text-gray-700" />
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
                  <p className="text-sm text-gray-600">
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                  </p>
                </div>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="p-2 glass-card rounded-xl hover:bg-white/80 transition-colors"
                >
                  <FiFilter className="text-gray-600 text-lg" />
                </button>
              </div>

              {/* Filter Options */}
              {showFilter && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedStatus(option.value);
                        setShowFilter(false);
                      }}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${selectedStatus === option.value
                        ? 'gradient-green text-white'
                        : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Orders List */}
            <div
              ref={elementRef}
              className="px-4 py-4"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translateY(${Math.min(pullDistance, 80)}px)`,
                transition: isPulling ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Loading orders...</h3>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl text-gray-300 mx-auto mb-4">📦</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
                  <p className="text-gray-600 mb-6">
                    {selectedStatus === 'all'
                      ? "You haven't placed any orders yet"
                      : `No ${selectedStatus} orders`}
                  </p>
                  <button
                    onClick={() => navigate('/app')}
                    className="gradient-green text-white px-6 py-3 rounded-xl font-semibold"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredOrders.map((order, index) => (
                    <motion.div
                      key={order._id || order.id || order.orderCode || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MobileOrderCard order={order} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    </ProtectedRoute>
  );
};

export default MobileOrders;

