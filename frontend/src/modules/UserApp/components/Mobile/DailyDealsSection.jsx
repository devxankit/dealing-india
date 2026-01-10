import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiClock, FiZap } from "react-icons/fi";
import ProductCard from "../../../../shared/components/ProductCard";

const DailyDealsSection = ({ products = [], campaign = null, isLoading = false }) => {
  const dailyDeals = products.slice(0, 4);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });


  // Countdown timer - always show timer when campaign exists
  // Uses campaign endDate (admin selected date) if available, otherwise defaults to end of day
  useEffect(() => {
    if (!campaign) {
      // No campaign, set timer to 0
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDate;

      // Priority 1: Check if countdown is disabled in pageConfig
      if (campaign.pageConfig?.showCountdown === false) {
        // Countdown disabled, use end of day as fallback
        targetDate = new Date();
        targetDate.setHours(23, 59, 59, 999);
      } 
      // Priority 2: Use campaign end date if countdownType is 'campaign_end' (admin selected date)
      else if (campaign.pageConfig?.countdownType === 'campaign_end' && campaign.endDate) {
        // Use campaign end date (admin selected date)
        targetDate = new Date(campaign.endDate);
      } 
      // Priority 3: Use daily reset if countdownType is 'daily_reset'
      else if (campaign.pageConfig?.countdownType === 'daily_reset') {
        // Use end of day (resets daily)
        targetDate = new Date();
        targetDate.setHours(23, 59, 59, 999);
      } 
      // Priority 4: Fallback to campaign end date if available (admin selected date)
      else if (campaign.endDate) {
        // Use campaign end date (admin selected date) - most common case
        targetDate = new Date(campaign.endDate);
      } 
      // Priority 5: Final fallback - end of day
      else {
        targetDate = new Date();
        targetDate.setHours(23, 59, 59, 999);
      }

      const difference = targetDate - now;

      if (difference > 0) {
        // Calculate total time units correctly
        const totalSeconds = Math.floor(difference / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        
        // Calculate days, hours, minutes, seconds
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24; // Hours remaining after days
        const minutes = totalMinutes % 60; // Minutes remaining after hours
        const seconds = totalSeconds % 60; // Seconds remaining after minutes

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [campaign]);

  const formatTime = (value) => {
    return value.toString().padStart(2, "0");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative my-4 rounded-2xl overflow-hidden shadow-xl border-2 border-green-200 bg-gradient-to-br from-emerald-500 via-green-500 to-lime-300">
        <div className="relative px-3 py-5">
          <div className="flex items-center justify-center py-8">
            <div className="text-white text-sm">Loading daily deals...</div>
          </div>
        </div>
      </div>
    );
  }

  // Only show section if:
  // 1. There's an active daily_deal campaign
  // 2. Campaign has products
  // Hide if no campaign OR no products
  if (!isLoading && (!campaign || dailyDeals.length === 0)) {
    return null;
  }

  return (
    <div className="relative my-4 rounded-2xl overflow-hidden shadow-xl border-2 border-green-200 bg-gradient-to-br from-emerald-500 via-green-500 to-lime-300">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative px-3 py-5">
        {/* Header with Badge */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <FiZap className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white drop-shadow-lg">
                  Daily Deals
                </h2>
                <p className="text-xs text-white/90 font-medium">
                  Limited time offers
                </p>
              </div>
            </div>
            <Link
              to="/app/daily-deals"
              className="bg-white/20 backdrop-blur-sm text-green-200 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all">
              See All
            </Link>
          </div>

          {/* Prominent Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 shadow-2xl border-2 border-white/50 mb-6 lg:mb-8 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg p-2">
                  <FiClock className="text-white text-xl md:text-2xl" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Deal ends in
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                {/* Days - only show if > 0 */}
                {timeLeft.days > 0 && (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl px-3 py-2 md:px-5 md:py-3 min-w-[3rem] md:min-w-[4.5rem] text-center shadow-lg border-b-4 border-green-700">
                        <div className="text-xl md:text-3xl font-black tracking-tighter">
                          {formatTime(timeLeft.days)}
                        </div>
                      </div>
                      <div className="text-[10px] md:text-xs font-bold text-green-700 mt-1 uppercase">Days</div>
                    </div>
                    <span className="text-green-600 font-black text-xl md:text-3xl mb-4">:</span>
                  </>
                )}
                {/* Hours */}
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl px-3 py-2 md:px-5 md:py-3 min-w-[3rem] md:min-w-[4.5rem] text-center shadow-lg border-b-4 border-green-700">
                    <div className="text-xl md:text-3xl font-black tracking-tighter">
                      {formatTime(timeLeft.hours)}
                    </div>
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-green-700 mt-1 uppercase">Hours</div>
                </div>
                <span className="text-green-600 font-black text-xl md:text-3xl mb-4">:</span>
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl px-3 py-2 md:px-5 md:py-3 min-w-[3rem] md:min-w-[4.5rem] text-center shadow-lg border-b-4 border-green-700">
                    <div className="text-xl md:text-3xl font-black tracking-tighter">
                      {formatTime(timeLeft.minutes)}
                    </div>
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-green-700 mt-1 uppercase">Mins</div>
                </div>
                <span className="text-green-600 font-black text-xl md:text-3xl mb-4">:</span>
                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-500 text-white rounded-xl px-3 py-2 md:px-5 md:py-3 min-w-[3rem] md:min-w-[4.5rem] text-center shadow-lg border-b-4 border-green-700 animate-pulse">
                    <div className="text-xl md:text-3xl font-black tracking-tighter">
                      {formatTime(timeLeft.seconds)}
                    </div>
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-green-700 mt-1 uppercase">Secs</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Products Grid */}
        {dailyDeals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
            {dailyDeals.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-white/80 text-sm font-medium">No deals available at the moment</p>
            <p className="text-white/60 text-xs mt-1">Check back soon for new deals!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyDealsSection;
