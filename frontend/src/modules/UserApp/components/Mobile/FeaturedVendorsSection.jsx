import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import VendorShowcaseCard from './VendorShowcaseCard';
import { getApprovedVendors } from '../../../../data/vendors';

const FeaturedVendorsSection = () => {
  const location = useLocation();
  const isMobileApp = location.pathname.startsWith('/app');
  const vendorsLink = isMobileApp ? '/app/search' : '/search';
  
  const approvedVendors = getApprovedVendors();
  const featuredVendors = approvedVendors
    .filter(v => v.isVerified)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

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
          className="flex items-center gap-1 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors"
        >
          <span>See All</span>
          <FiArrowRight className="text-sm" />
        </Link>
      </div>
      
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {featuredVendors.map((vendor, index) => (
          <VendorShowcaseCard key={vendor.id} vendor={vendor} index={index} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedVendorsSection;

