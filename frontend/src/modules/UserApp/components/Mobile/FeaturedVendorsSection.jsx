import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import VendorShowcaseCard from './VendorShowcaseCard';
import api from '../../../../shared/utils/api';

const FeaturedVendorsSection = () => {
  const location = useLocation();
  const isMobileApp = location.pathname.startsWith('/app');
  const vendorsLink = isMobileApp ? '/app/search' : '/search';
  
  const [featuredVendors, setFeaturedVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedVendors = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/vendors', {
          params: {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
        });

        // API interceptor returns response.data directly
        if (response && response.success && response.data) {
          const vendors = response.data.vendors || [];
          // Filter verified vendors and sort by rating
          const filteredVendors = vendors
            .filter(v => v.isVerified)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10);
          
          setFeaturedVendors(filteredVendors);
        }
      } catch (error) {
        console.error('Error fetching featured vendors:', error);
        // Set empty array on error
        setFeaturedVendors([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedVendors();
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Featured Vendors</h2>
            <p className="text-xs text-gray-600 mt-0.5">Shop from trusted stores</p>
          </div>
        </div>
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto md:overflow-x-visible scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="glass-card rounded-xl p-3 min-w-[130px] md:min-w-0 h-[180px] animate-pulse bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (featuredVendors.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Featured Vendors</h2>
          <p className="text-xs text-gray-600 mt-0.5">Shop from trusted stores</p>
        </div>
        <Link
          to={vendorsLink}
          className="flex items-center gap-1 text-sm text-green-600 font-semibold hover:text-green-700 transition-colors"
        >
          <span>See All</span>
          <FiArrowRight className="text-sm" />
        </Link>
      </div>
      
      <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto md:overflow-x-visible scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {featuredVendors.map((vendor, index) => (
          <VendorShowcaseCard key={vendor.id} vendor={vendor} index={index} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedVendorsSection;

