import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiFileText, FiShield, FiInfo, FiBell } from 'react-icons/fi';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';

const MobileContentPage = ({ title, type }) => {
    const navigate = useNavigate();

    const getContent = () => {
        switch (type) {
            case 'terms':
                return (
                    <div className="space-y-4 text-sm text-gray-600">
                        <h3 className="text-gray-900 font-bold">1. Introduction</h3>
                        <p>Welcome to Dealing India. By using our app, you agree to these terms.</p>
                        <h3 className="text-gray-900 font-bold">2. Usage</h3>
                        <p>You agree to use our platform for lawful purposes only.</p>
                        {/* Add more meaningful placeholder content */}
                        <h3 className="text-gray-900 font-bold">3. Orders & Returns</h3>
                        <p>All orders are subject to availability. Returns are processed as per our return policy.</p>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-4 text-sm text-gray-600">
                        <h3 className="text-gray-900 font-bold">Data Collection</h3>
                        <p>We collect basic information to process your orders and improve your experience.</p>
                        <h3 className="text-gray-900 font-bold">Data Security</h3>
                        <p>Your data is encrypted and stored securely. We do not share your personal information with third parties.</p>
                    </div>
                );
            case 'about':
                return (
                    <div className="space-y-4 text-sm text-gray-600">
                        <p className="font-medium">Dealing India is your one-stop destination for the best deals on premium brands.</p>
                        <p>Our mission is to make high-quality fashion and lifestyle products accessible to everyone at unbeatable prices.</p>
                        <div className="bg-indigo-50 p-4 rounded-xl mt-4">
                            <h4 className="text-indigo-900 font-bold mb-1">Contact Us</h4>
                            <p className="text-indigo-700">support@dealingindia.com</p>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="font-semibold text-gray-900">Order Updates</h3>
                                <p className="text-xs text-gray-500">Get notified about your order status</p>
                            </div>
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="font-semibold text-gray-900">Promotions</h3>
                                <p className="text-xs text-gray-500">Daily deals and exclusive offers</p>
                            </div>
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                            </div>
                        </div>
                    </div>
                );
            default:
                return <p>Content not available.</p>;
        }
    };

    return (
        <PageTransition>
            <MobileLayout showBottomNav={false} showCartBar={false}>
                <div className="min-h-screen bg-gray-50">
                    {/* Header */}
                    <div className="bg-white sticky top-0 z-50 px-4 py-3 flex items-center gap-3 shadow-sm">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <FiChevronLeft className="text-xl text-gray-800" />
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                    </div>

                    <div className="p-4">
                        <div className={type === 'notifications' ? "" : "bg-white rounded-2xl p-4 shadow-sm"}>
                            {getContent()}
                        </div>
                    </div>
                </div>
            </MobileLayout>
        </PageTransition>
    );
};

export default MobileContentPage;
