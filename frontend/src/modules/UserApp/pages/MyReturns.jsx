import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBox, FiClock, FiCheckCircle, FiXCircle, FiRefreshCcw } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import { getUserReturns } from '../../../shared/services/returnService';
import { formatPrice } from '../../../shared/utils/helpers';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Badge from '../../../shared/components/Badge';

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
            if (response.success) {
                setReturns(response.data);
            }
        } catch (error) {
            console.error('Error fetching returns:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            case 'cancelled': return 'bg-gray-100 text-gray-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <FiCheckCircle />;
            case 'rejected': return <FiXCircle />;
            case 'completed': return <FiCheckCircle />;
            case 'cancelled': return <FiXCircle />;
            default: return <FiClock />;
        }
    };

    return (
        <ProtectedRoute>
            <PageTransition>
                <MobileLayout showBottomNav={true} showCartBar={false}>
                    <div className="pb-20">
                        {/* Header */}
                        <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center gap-3">
                            <button onClick={() => navigate('/app/profile')} className="p-2 hover:bg-gray-100 rounded-full">
                                <FiArrowLeft className="text-xl text-gray-700" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-800">My Returns</h1>
                        </div>

                        {loading ? (
                            <LoadingSpinner />
                        ) : returns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <FiRefreshCcw className="text-3xl text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">No Returns Yet</h3>
                                <p className="text-gray-500 mb-6">You haven't requested any returns yet.</p>
                                <button
                                    onClick={() => navigate('/app/orders')}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
                                >
                                    View Orders
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4">
                                {returns.map((request) => (
                                    <div key={request._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="p-4 border-b border-gray-100 flexjustify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-gray-500">#{request.returnCode}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium ${getStatusColor(request.status)}`}>
                                                        {getStatusIcon(request.status)}
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">
                                                    Requested on {new Date(request.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gray-50">
                                            <div className="space-y-3">
                                                {request.items.map((item, idx) => (
                                                    <div key={idx} className="flex gap-3">
                                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 overflow-hidden">
                                                            {/* Simple placeholder or image if available */}
                                                            <FiBox />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                                {item.productId?.name || 'Product'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Qty: {item.quantity} • {formatPrice(item.price)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Refund Amount</span>
                                            <span className="font-bold text-green-600">{formatPrice(request.refundAmount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

export default MyReturns;
