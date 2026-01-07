import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiDownload, FiCalendar, FiTrendingUp, FiSettings } from 'react-icons/fi';
import { getAdminOrderAnalytics } from '../../../../../shared/services/orderService';
import { generateCSV } from '../../../utils/adminHelpers';
import toast from 'react-hot-toast';

const OrderAnalyticsCharts = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ today: [], week: [], month: [], year: [] });
    const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewType, setViewType] = useState('count'); // 'count' or 'revenue'
    const [metricType, setMetricType] = useState('absolute'); // 'absolute' or 'percentage'

    // Calculate totals for percentages with safety checks
    const totals = useMemo(() => {
        const calcTotal = (arr) => {
            if (!arr || !Array.isArray(arr)) return { orders: 0, revenue: 0 };
            const orders = arr.reduce((sum, item) => sum + (Number(item.orders) || 0), 0);
            const revenue = arr.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
            return { orders, revenue };
        };

        return {
            today: calcTotal(data?.today),
            week: calcTotal(data?.week),
            month: calcTotal(data?.month),
            year: calcTotal(data?.year),
        };
    }, [data]);

    const transformData = (baseData, periodTotal) => {
        if (!baseData || !Array.isArray(baseData)) return [];
        return baseData.map(item => {
            const val = viewType === 'count' ? (item.orders || 0) : (item.revenue || 0);
            const total = viewType === 'count' ? (periodTotal.orders || 0) : (periodTotal.revenue || 0);
            const percentage = total > 0 ? (val / total) * 100 : 0;

            return {
                ...item,
                displayValue: metricType === 'absolute' ? val : parseFloat(percentage.toFixed(1)),
                originalValue: val
            };
        });
    };

    const chartData = useMemo(() => ({
        today: transformData(data.today, totals.today),
        week: transformData(data.week, totals.week),
        month: transformData(data.month, totals.month),
        year: transformData(data.year, totals.year),
    }), [data, totals, viewType, metricType]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [todayRes, weeklyRes, monthlyRes, yearlyRes] = await Promise.all([
                getAdminOrderAnalytics({ type: 'today', date: todayDate }),
                getAdminOrderAnalytics({ type: 'weekly' }),
                getAdminOrderAnalytics({ type: 'monthly' }),
                getAdminOrderAnalytics({ type: 'yearly' })
            ]);

            setData({
                today: Array.isArray(todayRes?.data) ? todayRes.data : [],
                week: Array.isArray(weeklyRes?.data) ? weeklyRes.data : [],
                month: Array.isArray(monthlyRes?.data) ? monthlyRes.data : [],
                year: Array.isArray(yearlyRes?.data) ? yearlyRes.data : []
            });
        } catch (error) {
            toast.error('Failed to load order analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const fetchToday = async () => {
            try {
                const todayData = await getAdminOrderAnalytics({ type: 'today', date: todayDate });
                if (todayData?.data && Array.isArray(todayData.data)) {
                    setData(prev => ({ ...prev, today: todayData.data }));
                }
            } catch (error) {
                console.error('Failed to update today\'s chart:', error);
            }
        };
        fetchToday();
    }, [todayDate]);

    const exportData = (chartData, filename) => {
        const headers = [
            { label: 'Label', key: 'label' },
            { label: 'Orders', key: 'orders' },
            { label: 'Revenue (₹)', key: 'revenue' },
        ];
        generateCSV(chartData, headers, filename);
    };

    const ChartWrapper = ({ title, children, exportAction, datePicker, hasData }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {datePicker}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-9">
                        <button
                            onClick={exportAction}
                            className="px-3 h-full text-gray-500 hover:text-blue-600 hover:bg-gray-50 border-r border-gray-200"
                            title="Export CSV"
                        >
                            <FiDownload size={16} />
                        </button>
                        <button
                            onClick={() => toast.success('PNG Export coming soon!')}
                            className="px-3 h-full text-gray-500 hover:text-green-600 hover:bg-gray-50"
                            title="Export PNG"
                        >
                            <FiSettings size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 min-h-[300px]">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : !hasData ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <FiTrendingUp size={40} className="opacity-20" />
                        <p className="text-sm font-medium">No data available for this period</p>
                    </div>
                ) : children}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-xl ring-4 ring-black/5">
                    <p className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-500 font-medium">Orders:</span>
                            <span className="text-blue-600 font-bold">{dataPoint.orders}</span>
                        </p>
                        <p className="flex justify-between gap-4 text-sm">
                            <span className="text-gray-500 font-medium">Revenue:</span>
                            <span className="text-green-600 font-bold">₹{dataPoint.revenue.toLocaleString()}</span>
                        </p>
                        {metricType === 'percentage' && (
                            <p className="flex justify-between gap-4 text-sm border-t border-gray-50 pt-1 mt-1">
                                <span className="text-gray-500 font-medium">Share:</span>
                                <span className="text-primary-600 font-bold">{payload[0].value}%</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                        <FiTrendingUp size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Order Trends</h2>
                        <p className="text-xs text-gray-500 font-medium">Real-time performance analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setViewType('count')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewType === 'count' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Orders
                        </button>
                        <button
                            onClick={() => setViewType('revenue')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewType === 'revenue' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Revenue
                        </button>
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setMetricType('absolute')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${metricType === 'absolute' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            # Count
                        </button>
                        <button
                            onClick={() => setMetricType('percentage')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${metricType === 'percentage' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            % Share
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWrapper
                    title="Hourly Distribution"
                    exportAction={() => exportData(data.today, `today-orders-${todayDate}.csv`)}
                    hasData={chartData.today.some(d => d.orders > 0 || d.revenue > 0)}
                    datePicker={
                        <div className="relative">
                            <FiCalendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            <input
                                type="date"
                                value={todayDate}
                                onChange={(e) => setTodayDate(e.target.value)}
                                className="pl-8 pr-2 py-1.5 h-9 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none w-32"
                            />
                        </div>
                    }
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.today}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="displayValue"
                                fill={viewType === 'count' ? '#3b82f6' : '#10b981'}
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                                name={metricType === 'absolute' ? (viewType === 'count' ? 'Orders' : 'Revenue') : 'Share %'}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartWrapper>

                <ChartWrapper
                    title="Last 7 Days Trend"
                    exportAction={() => exportData(data.week, 'weekly-orders.csv')}
                    hasData={chartData.week.some(d => d.orders > 0 || d.revenue > 0)}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.week}>
                            <defs>
                                <linearGradient id="colorWeek" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="displayValue"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                fill="url(#colorWeek)"
                                animationDuration={1500}
                                name={metricType === 'absolute' ? (viewType === 'count' ? 'Orders' : 'Revenue') : 'Share %'}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartWrapper>

                <ChartWrapper
                    title="30 Days Activity"
                    exportAction={() => exportData(data.month, 'monthly-orders.csv')}
                    hasData={chartData.month.some(d => d.orders > 0 || d.revenue > 0)}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.month}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} hide={data.month.length > 15} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="displayValue"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ r: 2 }}
                                activeDot={{ r: 6 }}
                                animationDuration={1500}
                                name={metricType === 'absolute' ? (viewType === 'count' ? 'Orders' : 'Revenue') : 'Share %'}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartWrapper>

                <ChartWrapper
                    title="Monthly Performance (12m)"
                    exportAction={() => exportData(data.year, 'yearly-orders.csv')}
                    hasData={chartData.year.some(d => d.orders > 0 || d.revenue > 0)}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.year}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                dataKey="displayValue"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                                name={metricType === 'absolute' ? (viewType === 'count' ? 'Orders' : 'Revenue') : 'Share %'}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartWrapper>
            </div>
        </div>
    );
};

export default OrderAnalyticsCharts;
