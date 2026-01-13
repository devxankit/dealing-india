import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WholesalerSidebar from './WholesalerSidebar';
import WholesalerHeader from './WholesalerHeader';
import useAdminHeaderHeight from '../../../Admin/hooks/useAdminHeaderHeight';

const WholesalerLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const headerHeight = useAdminHeaderHeight();
    const location = useLocation();

    const isChatPage = location.pathname.includes('/wholesaler/messages');

    // Add small buffer to prevent content overlap (8px)
    const topPadding = headerHeight + 8;

    return (
        <div className={`${isChatPage ? 'h-screen' : 'min-h-screen'} bg-gray-50 flex overflow-hidden`}>
            {/* Sidebar */}
            <WholesalerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-64 min-w-0 max-w-full overflow-x-hidden">
                {/* Header */}
                <WholesalerHeader onMenuClick={() => setSidebarOpen(true)} />

                {/* Page Content */}
                <main
                    className={`flex-1 p-3 sm:p-4 lg:p-6 ${isChatPage ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden lg:pb-6 lg:pt-24 scrollbar-admin w-full min-w-0`}
                    style={{
                        paddingTop: `${Math.max(topPadding, 80)}px`,
                    }}
                >
                    <div className={`w-full max-w-full overflow-x-hidden min-w-0 ${isChatPage ? 'h-full' : ''}`}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default WholesalerLayout;
