import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiCheck, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import { getOrderById } from '../../../shared/services/orderService';
import { checkReturnEligibility, createReturnRequest } from '../../../shared/services/returnService';
import { formatPrice } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import PageTransition from '../../../shared/components/PageTransition';
import ProtectedRoute from '../../../shared/components/Auth/ProtectedRoute';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

const ReturnRequest = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Form State
    const [selectedItems, setSelectedItems] = useState({}); // { itemId: quantity }
    const [returnReason, setReturnReason] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]); // Placeholder for image uploads

    const reasons = [
        { value: 'defective', label: 'Defective/Damaged Product' },
        { value: 'wrong_item', label: 'Received Wrong Item' },
        { value: 'wrong_size', label: 'Size/Fit Issues' },
        { value: 'not_as_described', label: 'Product Not As Described' },
        { value: 'quality_issue', label: 'Quality Issues' },
        { value: 'helper', label: 'Other' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch Order
                const orderResponse = await getOrderById(orderId);

                const orderData = orderResponse?.order || (orderResponse?.success && orderResponse?.data?.order);

                if (orderData) {
                    setOrder(orderData);
                } else {
                    toast.error('Order not found');
                    navigate('/app/orders');
                    return;
                }

                // 2. Check Eligibility
                const eligibilityResponse = await checkReturnEligibility(orderId);
                if (eligibilityResponse.success) {
                    setEligibility(eligibilityResponse.data);
                    if (!eligibilityResponse.data.eligible) {
                        // Determine actions if not eligible (e.g. show alert but allow view, or block)
                        // For now, we will show blocking UI in render
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Failed to load return details');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orderId, navigate]);

    const toggleItemSelection = (item, itemId) => {
        const currentQty = selectedItems[itemId] || 0;
        if (currentQty > 0) {
            const newSelected = { ...selectedItems };
            delete newSelected[itemId];
            setSelectedItems(newSelected);
        } else {
            setSelectedItems({ ...selectedItems, [itemId]: (item.quantity || 1) }); // Default to max qty or 1
        }
    };

    const updateItemQuantity = (itemId, newQty, maxQty) => {
        if (newQty < 1 || newQty > maxQty) return;
        setSelectedItems({ ...selectedItems, [itemId]: newQty });
    };

    const calculateRefundAmount = () => {
        if (!order) return 0;
        let total = 0;
        Object.entries(selectedItems).forEach(([itemId, qty]) => {
            // Find item in order.items
            // Note: itemId logic needs to match how we keyed it. Order items might not have _id if simple array, but usually Mongoose adds it.
            // Fallback to index if needed but ID is better.
            const item = order.items.find(i => (i._id || i.id) === itemId);
            if (item) {
                total += (item.price * qty);
            }
        });
        return total;
    };

    const handleSubmit = async () => {
        if (!returnReason) {
            toast.error('Please select a reason for return');
            return;
        }

        const itemsToReturn = Object.entries(selectedItems).map(([itemId, quantity]) => {
            const item = order.items.find(i => (i._id || i.id) === itemId);
            return {
                productId: item.productId._id || item.productId, // Handle populated or raw ID
                itemId: itemId,
                quantity,
                reason: returnReason // Use global reason for now
            };
        });

        if (itemsToReturn.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }

        try {
            setSubmitLoading(true);
            const returnData = {
                orderId,
                items: itemsToReturn,
                reason: returnReason,
                description,
                images
            };

            const response = await createReturnRequest(returnData);
            if (response.success || response.status === 'success') {
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error(error);
            // Handle specific "already exists" case silently if we want to just go to My Returns? 
            // Better to show error.
            toast.error(error.response?.data?.message || 'Failed to submit return request');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!order) return null;

    if (eligibility && !eligibility.eligible) {
        return (
            <MobileLayout showBottomNav={false} showCartBar={false}>
                <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <FiAlertCircle className="text-4xl text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Not Eligible for Return</h2>
                    <p className="text-gray-600 mb-6">{eligibility.reason}</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-200 rounded-full font-semibold">
                        Go Back
                    </button>
                    <button onClick={() => navigate('/app/returns')} className="mt-4 text-primary-600 font-medium">
                        View My Returns
                    </button>
                </div>
            </MobileLayout>
        );
    }

    return (
        <ProtectedRoute>
            <PageTransition>
                <MobileLayout showBottomNav={false} showCartBar={false}>
                    <div className="pb-24">
                        {/* Header */}
                        <div className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                                <FiArrowLeft className="text-xl text-gray-700" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-800">Request Return</h1>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* 1. Select Items */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Select Items to Return</h3>
                                <div className="space-y-3">
                                    {order.items.map((item) => {
                                        const itemId = item._id || item.id;
                                        const isSelected = !!selectedItems[itemId];
                                        const qty = selectedItems[itemId] || 0;
                                        const imageUrl = item.image || item.productId?.images?.[0] || '/placeholder.png'; // Improved safe access

                                        return (
                                            <div key={itemId}
                                                className={`relative p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-white shadow-sm'}`}
                                                onClick={() => !isSelected && toggleItemSelection(item, itemId)}
                                            >
                                                <div className="flex gap-3">
                                                    {/* Checkbox */}
                                                    <div onClick={(e) => { e.stopPropagation(); toggleItemSelection(item, itemId); }}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer ${isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'}`}>
                                                        {isSelected && <FiCheck size={14} />}
                                                    </div>

                                                    <img src={imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />

                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800 text-sm line-clamp-1">{item.name}</p>
                                                        <p className="text-sm text-gray-600">{formatPrice(item.price)}</p>

                                                        {isSelected && (
                                                            <div className="flex items-center gap-3 mt-2" onClick={e => e.stopPropagation()}>
                                                                <span className="text-xs text-gray-500">Qty to return:</span>
                                                                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-1 py-0.5">
                                                                    <button
                                                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-sm hover:bg-gray-200"
                                                                        onClick={() => updateItemQuantity(itemId, qty - 1, item.quantity)}
                                                                        disabled={qty <= 1}
                                                                    >-</button>
                                                                    <span className="text-sm font-semibold w-4 text-center">{qty}</span>
                                                                    <button
                                                                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-sm hover:bg-gray-200"
                                                                        onClick={() => updateItemQuantity(itemId, qty + 1, item.quantity)}
                                                                        disabled={qty >= item.quantity}
                                                                    >+</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Reason */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800">Reason for Return</h3>
                                <div className="space-y-2">
                                    {reasons.map((r) => (
                                        <label key={r.value} className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm cursor-pointer border border-transparent hover:border-gray-200">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${returnReason === r.value ? 'border-primary-500' : 'border-gray-300'}`}>
                                                {returnReason === r.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                            </div>
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={r.value}
                                                checked={returnReason === r.value}
                                                onChange={(e) => setReturnReason(e.target.value)}
                                                className="hidden"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{r.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Description */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-gray-800">Additional Comments</h3>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe the issue in detail..."
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary-500 outline-none min-h-[100px] text-sm"
                                />
                            </div>

                            {/* 4. Images (Visual Placeholder) */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-gray-800">Upload Images (Optional)</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    <button className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50 flex-shrink-0">
                                        <FiCamera size={24} />
                                        <span className="text-xs mt-1">Add</span>
                                    </button>
                                    {/* Mapped images would go here */}
                                </div>
                            </div>

                            {/* Refund Summary */}
                            <div className="glass-card p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Refund Method</span>
                                    <span className="font-semibold text-primary-600">Wallet Credit</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span className="text-gray-800">Estimated Refund</span>
                                    <span className="text-green-600">{formatPrice(calculateRefundAmount())}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Refund will be credited to your wallet after approval.</p>
                            </div>

                        </div>

                        {/* Bottom Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40 md:pl-64">
                            <button
                                onClick={handleSubmit}
                                disabled={submitLoading || Object.keys(selectedItems).length === 0}
                                className="w-full py-3.5 gradient-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none"
                            >
                                {submitLoading ? 'Submitting...' : 'Submit Return Request'}
                            </button>
                        </div>

                        {/* Success Modal */}
                        <AnimatePresence>
                            {showSuccessModal && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-black/60 z-[9999]"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: "50%" }}
                                        animate={{ opacity: 1, scale: 1, y: "-50%" }}
                                        exit={{ opacity: 0, scale: 0.9, y: "50%" }}
                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 w-[85%] max-w-sm bg-white rounded-3xl p-8 z-[10000] text-center shadow-2xl"
                                    >
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FiCheckCircle className="text-5xl text-green-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Requested!</h2>
                                        <p className="text-gray-500 mb-8">
                                            Your return request has been submitted successfully. You can track its status in "My Returns".
                                        </p>
                                        <button
                                            onClick={() => navigate('/app/returns')}
                                            className="w-full py-3.5 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-600 transition-colors"
                                        >
                                            Go to My Returns
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>

                    </div>
                </MobileLayout>
            </PageTransition>
        </ProtectedRoute>
    );
};

export default ReturnRequest;
