import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiDownload, FiCalendar, FiUserPlus, FiUsers, FiUserCheck, FiClock, FiRefreshCw, FiList, FiGrid } from 'react-icons/fi';
import { useVendorManagementStore } from '../../../store/vendorManagementStore';
import { generateCSV } from '../../../utils/adminHelpers';
import toast from 'react-hot-toast';

const VendorRegistrationCharts = () => {
    const { fetchVendorRegistrationAnalytics } = useVendorManagementStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState(null);
    const [data, setData] = useState({ today: [], weekly: [], monthly: [], yearly: [] });
    const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0]);
    const [metricType, setMetricType] = useState('absolute');
    const [viewMode, setViewMode] = useState('charts'); // 'charts' or 'table'

    // Custom date range
    const [customRange, setCustomRange] = useState({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [customData, setCustomData] = useState([]);
    const [detailedVendors, setDetailedVendors] = useState([]);
    const [selectedDateForDetails, setSelectedDateForDetails] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'registeredAt', direction: 'desc' });

    const fetchData = async (type = null, date = null) => {
        if (!type) setLoading(true);
        try {
            const res = await fetchVendorRegistrationAnalytics({ type, date });
            if (res.success) {
                if (!type) {
                    setData(res.data);
                    setSummary(res.summary);
                } else if (type === 'today') {
                    setData(prev => ({ ...prev, today: res.data }));
                    setSummary(res.summary);
                }
            }
        } catch (error) {
            toast.error('Failed to load vendor analytics');
        } finally {
            if (!type) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        toast.success('Data refreshed successfully');
        setRefreshing(false);
    };

    const fetchCustomRange = async () => {
        try {
            const res = await fetchVendorRegistrationAnalytics({
                type: 'custom',
                startDate: customRange.startDate,
                endDate: customRange.endDate
            });
            if (res.success && Array.isArray(res.data)) {
                setCustomData(res.data);
            }
        } catch (error) {
            toast.error('Failed to fetch custom range data');
        }
    };

    const fetchVendorDetails = async (date) => {
        setSelectedDateForDetails(date);
        try {
            const res = await fetchVendorRegistrationAnalytics({ type: 'details', date });
            if (res.success && Array.isArray(res.data)) {
                setDetailedVendors(res.data);
            }
        } catch (error) {
            toast.error('Failed to fetch vendor details');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (todayDate) {
            fetchData('today', todayDate);
        }
    }, [todayDate]);

    useEffect(() => {
        fetchCustomRange();
    }, [customRange.startDate, customRange.endDate]);

    // Calculate totals for percentages
    const totals = useMemo(() => {
        const calcTotal = (arr) => {
            if (!arr || !Array.isArray(arr)) return 0;
            return arr.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
        };

        return {
            today: calcTotal(data?.today),
            weekly: calcTotal(data?.weekly),
            monthly: calcTotal(data?.monthly),
            yearly: calcTotal(data?.yearly),
            custom: calcTotal(customData),
        };
    }, [data, customData]);

    const transformData = (baseData, total) => {
        if (!baseData || !Array.isArray(baseData)) return [];
        return baseData.map(item => {
            const val = Number(item.count) || 0;
            const percentage = total > 0 ? (val / total) * 100 : 0;

            return {
                ...item,
                displayValue: metricType === 'absolute' ? val : parseFloat(percentage.toFixed(1)),
                originalValue: val
            };
        });
    };

    const chartData = useMemo(() => ({
        today: transformData(data?.today, totals.today),
        weekly: transformData(data?.weekly, totals.weekly),
        monthly: transformData(data?.monthly, totals.monthly),
        yearly: transformData(data?.yearly, totals.yearly),
        custom: transformData(customData, totals.custom),
    }), [data, customData, totals, metricType]);

    const exportData = (rawBatchData, filename) => {
        const headers = [
            { label: 'Label', key: 'label' },
            { label: 'Registrations', key: 'count' },
        ];
        generateCSV(rawBatchData, headers, filename);
    };

    const exportVendorDetails = () => {
        const headers = [
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Store Name', key: 'storeName' },
            { label: 'Status', key: 'status' },
            { label: 'Active', key: 'isActive' },
            { label: 'Registered At', key: 'registeredAt' },
        ];
        generateCSV(detailedVendors, headers, `vendors-${selectedDateForDetails}.csv`);
    };

    // Sorted vendors
    const sortedVendors = useMemo(() => {
        const sorted = [...detailedVendors];
        sorted.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [detailedVendors, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => (
        <div
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className={`p-3 rounded-lg ${colorClass}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                <p className="text-xl font-bold text-gray-800">{loading ? '...' : value}</p>
            </div>
        </div>
    );

    const ChartWrapper = ({ title, children, exportAction, datePicker, hasData }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {datePicker}
                    <button
                        onClick={exportAction}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100"
                        title="Export CSV"
                    >
                        <FiDownload size={18} />
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-[300px]">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : !hasData ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                        <FiUserPlus size={40} className="opacity-20" />
                        <p className="text-sm font-medium">No registrations recorded</p>
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
                            <span className="text-gray-500 font-medium">Registrations:</span>
                            <span className="text-blue-600 font-bold">{dataPoint.count || dataPoint.originalValue}</span>
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
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Vendors" value={summary?.totalVendors} icon={FiUsers} colorClass="bg-blue-50 text-blue-600" />
                <StatCard title="Pending" value={summary?.pending} icon={FiClock} colorClass="bg-yellow-50 text-yellow-600" />
                <StatCard title="Approved" value={summary?.approved} icon={FiUserCheck} colorClass="bg-green-50 text-green-600" />
                <StatCard title="Active" value={summary?.activeVendors} icon={FiUserCheck} colorClass="bg-indigo-50 text-indigo-600" />
                <StatCard title="Avg Age (Days)" value={summary?.avgAge} icon={FiClock} colorClass="bg-purple-50 text-purple-600" />
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                        <FiUserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Registration Trends</h2>
                        <p className="text-xs text-gray-500 font-medium">New vendor acquisition analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setViewMode('charts')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'charts' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FiGrid size={14} /> Charts
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FiList size={14} /> Table
                        </button>
                    </div>

                    {/* Metric Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setMetricType('absolute')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${metricType === 'absolute' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            # Count
                        </button>
                        <button
                            onClick={() => setMetricType('percentage')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${metricType === 'percentage' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            % Share
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors ${refreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                        <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {viewMode === 'charts' ? (
                <>
                    {/* Chart Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Today's Chart */}
                        <ChartWrapper
                            title="Hourly Registrations"
                            exportAction={() => exportData(data?.today, `vendor-registrations-${todayDate}.csv`)}
                            hasData={chartData.today.some(d => d.originalValue > 0)}
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
                                    <Bar dataKey="displayValue" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1500} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartWrapper>

                        {/* Weekly Chart */}
                        <ChartWrapper
                            title="Last 7 Days Acquisition"
                            exportAction={() => exportData(data?.weekly, 'weekly-vendor-registrations.csv')}
                            hasData={chartData.weekly.some(d => d.originalValue > 0)}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.weekly}>
                                    <defs>
                                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="displayValue" stroke="#10b981" strokeWidth={3} fill="url(#colorReg)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartWrapper>

                        {/* Monthly Chart */}
                        <ChartWrapper
                            title="30 Days Growth"
                            exportAction={() => exportData(data?.monthly, 'monthly-vendor-registrations.csv')}
                            hasData={chartData.monthly.some(d => d.originalValue > 0)}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData.monthly}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} hide={data?.monthly?.length > 15} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="displayValue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} animationDuration={1500} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartWrapper>

                        {/* Yearly Chart */}
                        <ChartWrapper
                            title="Annual Overview (12m)"
                            exportAction={() => exportData(data?.yearly, 'yearly-vendor-registrations.csv')}
                            hasData={chartData.yearly.some(d => d.originalValue > 0)}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.yearly}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="displayValue" fill="#f59e0b" radius={[4, 4, 0, 0]} animationDuration={1500} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartWrapper>
                    </div>

                    {/* Custom Date Range Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Custom Date Range</h3>
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-500">From:</label>
                                    <input
                                        type="date"
                                        value={customRange.startDate}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-500">To:</label>
                                    <input
                                        type="date"
                                        value={customRange.endDate}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => exportData(customData, `custom-registrations-${customRange.startDate}-to-${customRange.endDate}.csv`)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <FiDownload size={14} /> Export
                                </button>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.custom}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} hide={customData.length > 10} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit={metricType === 'percentage' ? '%' : ''} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="displayValue"
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                        onClick={(data) => {
                                            if (data && data.date) {
                                                fetchVendorDetails(data.date);
                                            }
                                        }}
                                        cursor="pointer"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="mt-4 text-xs text-gray-500 text-center">Click on a bar to view detailed vendor registrations for that date</p>
                    </div>
                </>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Registration Details</h3>
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Select Date:</label>
                                <input
                                    type="date"
                                    value={selectedDateForDetails || todayDate}
                                    onChange={(e) => fetchVendorDetails(e.target.value)}
                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            {detailedVendors.length > 0 && (
                                <button
                                    onClick={exportVendorDetails}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <FiDownload size={14} /> Export CSV
                                </button>
                            )}
                        </div>
                    </div>

                    {detailedVendors.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <FiUserPlus size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No vendors registered on this date</p>
                            <p className="text-sm mt-1">Select a different date to view registrations</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('name')}
                                        >
                                            Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('email')}
                                        >
                                            Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('storeName')}
                                        >
                                            Store {sortConfig.key === 'storeName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('status')}
                                        >
                                            Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-gray-900"
                                            onClick={() => handleSort('registeredAt')}
                                        >
                                            Time {sortConfig.key === 'registeredAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedVendors.map((vendor) => (
                                        <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-medium text-gray-800">{vendor.name}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{vendor.email}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{vendor.storeName}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${vendor.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {vendor.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {new Date(vendor.registeredAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VendorRegistrationCharts;
