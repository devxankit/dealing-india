import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import { getUserReturns } from '../../../shared/services/returnService';
import { formatPrice, formatDate } from '../../../shared/utils/helpers';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import toast from 'react-hot-toast';

const MyReturns = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const response = await getUserReturns();
            console.log('MyReturns received:', response);

            // Handle both { data: [...] } and [...] formats
            let data = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                data = response.data;
            } else if (response && Array.isArray(response.returns)) {
                data = response.returns;
            }

            setReturns(data);

        } catch (error) {
            console.error('Fetch error:', error);
            // toast.error('Failed to load returns'); // Commented out to prevent ReferenceError
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'text-green-600 bg-green-50 border-green-200';
            case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
            case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-amber-600 bg-amber-50 border-amber-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
            case 'completed': return <FiCheckCircle />;
            case 'rejected':
            case 'cancelled': return <FiXCircle />;
            default: return <FiClock />;
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <ProtectedRoute>
            <PageTransition>
                <MobileLayout showBottomNav={true} showCartBar={false}>
                    <div className="min-h-screen bg-gray-50 pb-24">
                        {/* Header */}
                        <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center gap-3">
                            <button onClick={() => navigate('/app/profile')} className="p-2 hover:bg-gray-100 rounded-full">
                                <FiArrowLeft className="text-xl text-gray-700" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-800">My Returns</h1>
                        </div>

                        {/* List */}
                        <div className="p-4 space-y-4">
                            {returns.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <FiRefreshCw size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">No Returns Yet</h3>
                                    <p className="text-gray-500 text-sm max-w-[200px]">
                                        You haven't requested any returns yet.
                                    </p>
                                </div>
                            ) : (
                                returns.map((req) => (
                                    <div key={req._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        {/* Header */}
                                        <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Return ID: {req.returnCode}</p>
                                                <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getStatusColor(req.status)}`}>
                                                {getStatusIcon(req.status)}
                                                <span className="capitalize">{req.status}</span>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div className="p-4 bg-gray-50/50 space-y-3">
                                            {req.items.map((item, idx) => {
                                                const product = item.productId || {};
                                                return (
                                                    <div key={idx} className="flex gap-3">
                                                        <img
                                                            src={product.images?.[0] || '/placeholder.png'}
                                                            alt={product.name || 'Product'}
                                                            className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-100"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                                                {product.name || 'Product Details Unavailable'}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                                <span>Qty: {item.quantity}</span>
                                                                <span>•</span>
                                                                <span>{formatPrice(product.price || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-3 bg-white flex justify-between items-center border-t border-gray-50">
                                            <span className="text-sm text-gray-500">Refund Amount</span>
                                            <span className="font-bold text-gray-800">{formatPrice(req.refundAmount)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

export default MyReturns;
