import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

const InquiryTrendsChart = ({ data = [], period = 'month' }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate empty data for the period
      const days = period === 'year' ? 12 : period === 'month' ? 30 : 7;
      return Array.from({ length: days }, (_, i) => ({
        date: `Day ${i + 1}`,
        inquiries: 0
      }));
    }
    
    return data.map(item => ({
      date: item.date || item._id || '',
      inquiries: item.inquiries || item.count || 0
    }));
  }, [data, period]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">Inquiries:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.some(item => item.inquiries > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">Inquiry Trends</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Buyer inquiries over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <span className="text-xs text-gray-600">Inquiries</span>
        </div>
      </div>
      <div className="flex-1 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInquiries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="inquiries"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorInquiries)"
                name="Inquiries"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">No inquiry data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InquiryTrendsChart;
