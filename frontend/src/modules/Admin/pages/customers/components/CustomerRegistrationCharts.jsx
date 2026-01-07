import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { FiDownload, FiUserPlus, FiUsers, FiRefreshCw, FiList, FiGrid, FiUserX, FiSearch, FiEye } from 'react-icons/fi';
import { useCustomerStore } from '../../../../../shared/store/customerStore';
import { generateCSV } from '../../../utils/adminHelpers';
import CustomerDetailModal from './CustomerDetailModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CustomerRegistrationCharts = () => {
    const navigate = useNavigate();
    const { fetchCustomerRegistrationAnalytics } = useCustomerStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState(null);
    const [data, setData] = useState({ today: [], weekly: [], monthly: [], yearly: [] });
    const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0]);
    const [metricType, setMetricType] = useState('absolute');
    const [viewMode, setViewMode] = useState('charts'); // 'charts' or 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Custom date range
    const [customRange, setCustomRange] = useState({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [customData, setCustomData] = useState([]);
    const [detailedCustomers, setDetailedCustomers] = useState([]);
    const [selectedDateForDetails, setSelectedDateForDetails] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    const fetchData = async (type = null, date = null) => {
        if (!type) setLoading(true);
        try {
            const res = await fetchCustomerRegistrationAnalytics({ type, date });
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
            toast.error('Failed to load customer analytics');
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
            const res = await fetchCustomerRegistrationAnalytics({
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

    const fetchCustomerDetails = async (date) => {
        setSelectedDateForDetails(date);
        try {
            const res = await fetchCustomerRegistrationAnalytics({ type: 'details', date });
            if (res.success && Array.isArray(res.data)) {
                setDetailedCustomers(res.data);
            }
        } catch (error) {
            toast.error('Failed to fetch customer details');
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
        if (customRange.startDate && customRange.endDate) {
            fetchCustomRange();
        }
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

    const exportCustomerDetails = () => {
        const headers = [
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Phone', key: 'phone' },
            { label: 'Status', key: 'status' },
            { label: 'Registered At', key: 'createdAt' },
        ];
        generateCSV(detailedCustomers, headers, `customers-${selectedDateForDetails}.csv`);
    };

    // Filtered and sorted customers
    const filteredAndSortedCustomers = useMemo(() => {
        let filtered = [...detailedCustomers];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(customer => 
                customer.name?.toLowerCase().includes(query) || 
                customer.email?.toLowerCase().includes(query) ||
                customer.phone?.toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [detailedCustomers, sortConfig, searchQuery]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleViewDetails = (customerId) => {
        setSelectedCustomerId(customerId);
        setIsModalOpen(true);
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
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                <StatCard title="Total Customers" value={summary?.totalCustomers} icon={FiUsers} colorClass="bg-blue-50 text-blue-600" />
                <StatCard title="Blocked" value={summary?.blockedCustomers} icon={FiUserX} colorClass="bg-red-50 text-red-600" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setViewMode('charts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'charts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <FiGrid /> Charts
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <FiList /> Details
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setMetricType('absolute')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${metricType === 'absolute' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Count
                        </button>
                        <button
                            onClick={() => setMetricType('percentage')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${metricType === 'percentage' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            % Share
                        </button>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-500'}`}
                    >
                        <FiRefreshCw size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'charts' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hourly Chart */}
                    <ChartWrapper
                        title="Today's Hourly Growth"
                        hasData={totals.today > 0}
                        exportAction={() => exportData(data.today, `customers-today-${todayDate}.csv`)}
                        datePicker={
                            <input
                                type="date"
                                value={todayDate}
                                onChange={(e) => setTodayDate(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        }
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.today}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="displayValue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartWrapper>

                    {/* Weekly Chart */}
                    <ChartWrapper
                        title="Last 7 Days Growth"
                        hasData={totals.weekly > 0}
                        exportAction={() => exportData(data.weekly, 'customers-weekly.csv')}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.weekly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="displayValue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartWrapper>

                    {/* Monthly Chart */}
                    <ChartWrapper
                        title="Last 30 Days Trend"
                        hasData={totals.monthly > 0}
                        exportAction={() => exportData(data.monthly, 'customers-monthly.csv')}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.monthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={4} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="stepAfter" dataKey="displayValue" stroke="#10b981" strokeWidth={3} dot={{ r: 2, fill: '#10b981' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>

                    {/* Yearly Chart */}
                    <ChartWrapper
                        title="Annual Growth Overview"
                        hasData={totals.yearly > 0}
                        exportAction={() => exportData(data.yearly, 'customers-yearly.csv')}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.yearly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="displayValue" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf620" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-gray-800">Registration Details</h3>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                                />
                            </div>
                            <input
                                type="date"
                                value={selectedDateForDetails || ''}
                                onChange={(e) => fetchCustomerDetails(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {detailedCustomers.length > 0 && (
                            <button
                                onClick={exportCustomerDetails}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <FiDownload size={16} /> Export Customers
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                                        Customer {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                                        Registered {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">Loading data...</td>
                                    </tr>
                                ) : filteredAndSortedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                            <FiUserPlus size={40} className="mx-auto mb-2 opacity-20" />
                                            <p>No customers found</p>
                                        </td>
                                    </tr>
                                ) : filteredAndSortedCustomers.map((customer) => (
                                    <tr key={customer._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-800">{customer.name}</div>
                                            <div className="text-xs text-gray-500">{customer.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{customer.phone || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleViewDetails(customer._id || customer.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                                            >
                                                <FiEye size={14} />
                                                View
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(customer.createdAt).toLocaleString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Customer Detail Modal */}
            <CustomerDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customerId={selectedCustomerId}
            />
        </div>
    );
};

export default CustomerRegistrationCharts;
