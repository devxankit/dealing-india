import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const CategoryDistributionChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => ({
      name: item.name || item.category || 'Other',
      inquiries: item.inquiries || 0,
      products: item.products || 0
    })).slice(0, 10); // Limit to top 10
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          <p className="text-sm text-green-600">
            <span className="font-medium">Inquiries:</span> {data.inquiries}
          </p>
          <p className="text-sm text-blue-600">
            <span className="font-medium">Products:</span> {data.products}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.length > 0 && chartData.some(item => item.inquiries > 0 || item.products > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">Top Performing Categories</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Category-wise inquiry distribution</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Inquiries</span>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="inquiries" radius={[8, 8, 0, 0]} name="Inquiries">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">No category data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CategoryDistributionChart;
