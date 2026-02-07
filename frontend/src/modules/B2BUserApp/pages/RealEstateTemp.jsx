import React from 'react';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import { FiHome } from 'react-icons/fi';

const RealEstate = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <B2BHeader />

            <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                    <FiHome className="text-4xl text-primary-600" />
                </div>
                <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase tracking-tight">Real Estate</h1>
                <p className="text-gray-500 font-medium max-w-md">
                    Exclusive property listings coming soon. Stay tuned for premium real estate opportunities.
                </p>
            </main>

            <B2BBottomNav />
        </div>
    );
};

export default RealEstate;
