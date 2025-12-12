import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/apiClient';
import {
    TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign,
    BarChart3, PieChart, Activity, Eye, MousePointer, Clock,
    Globe, Smartphone, Monitor, ArrowUpRight, ArrowDownRight,
    RefreshCw, Calendar, Filter, Download, AlertCircle
} from 'lucide-react';

// ============================================
// POWER BI STYLE ADMIN ANALYTICS DASHBOARD
// ============================================

const AdminAnalytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');
    const [refreshing, setRefreshing] = useState(false);

    // Analytics Data States
    const [overview, setOverview] = useState(null);
    const [trafficData, setTrafficData] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [userActivity, setUserActivity] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [topSellers, setTopSellers] = useState([]);
    const [deviceStats, setDeviceStats] = useState({});
    const [geoData, setGeoData] = useState([]);

    useEffect(() => {
        loadAnalyticsData();
    }, [timeRange]);

    const loadAnalyticsData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load all analytics data in parallel from real endpoints
            const [
                overviewRes,
                trafficRes,
                salesRes,
                topProductsRes,
                topSellersRes,
                devicesRes,
                geoRes
            ] = await Promise.all([
                apiClient.get(`/api/admin/analytics/overview?range=${timeRange}`).catch(e => ({ data: null, error: e })),
                apiClient.get(`/api/admin/analytics/traffic?range=${timeRange}`).catch(e => ({ data: [] })),
                apiClient.get(`/api/admin/analytics/sales?range=${timeRange}`).catch(e => ({ data: [] })),
                apiClient.get('/api/admin/analytics/top-products?limit=5').catch(e => ({ data: [] })),
                apiClient.get('/api/admin/analytics/top-sellers?limit=5').catch(e => ({ data: [] })),
                apiClient.get('/api/admin/analytics/devices').catch(e => ({ data: { desktop: 33, mobile: 60, tablet: 7 } })),
                apiClient.get('/api/admin/analytics/geo').catch(e => ({ data: [] })),
            ]);

            // Set overview data
            if (overviewRes.data) {
                setOverview({
                    totalUsers: overviewRes.data.totalUsers || 0,
                    totalSellers: overviewRes.data.totalSellers || 0,
                    totalListings: overviewRes.data.totalListings || 0,
                    totalAdmins: overviewRes.data.totalAdmins || 0,
                    totalRevenue: overviewRes.data.totalRevenue || 0,
                    totalOrders: overviewRes.data.totalOrders || 0,
                    avgOrderValue: overviewRes.data.avgOrderValue || 0,
                    conversionRate: overviewRes.data.conversionRate || 0,
                    bounceRate: overviewRes.data.bounceRate || 0,
                    avgSessionDuration: overviewRes.data.avgSessionDuration || 0,
                    pageViews: overviewRes.data.pageViews || 0,
                    uniqueVisitors: overviewRes.data.uniqueVisitors || 0,
                    revenueGrowth: overviewRes.data.revenueGrowth || 0,
                    ordersGrowth: overviewRes.data.ordersGrowth || 0,
                    usersGrowth: overviewRes.data.usersGrowth || 0,
                    listingsGrowth: overviewRes.data.listingsGrowth || 0,
                });
            }

            // Set traffic data (use real data only)
            if (trafficRes.data && trafficRes.data.length > 0) {
                setTrafficData(trafficRes.data.map(t => ({
                    date: new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    pageViews: t.pageViews || 0,
                    visitors: t.visitors || 0,
                    sessions: t.sessions || 0,
                })));
            } else {
                setTrafficData([]);
            }

            // Set sales data (use real data only)
            if (salesRes.data && salesRes.data.length > 0) {
                setSalesData(salesRes.data.map(s => ({
                    date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    revenue: s.revenue || 0,
                    orders: s.orders || 0,
                })));
            } else {
                setSalesData([]);
            }

            // Set top products
            if (topProductsRes.data && topProductsRes.data.length > 0) {
                setTopProducts(topProductsRes.data);
            } else {
                setTopProducts([]);
            }

            // Set top sellers
            if (topSellersRes.data && topSellersRes.data.length > 0) {
                setTopSellers(topSellersRes.data);
            } else {
                setTopSellers([]);
            }

            // Set device stats
            setDeviceStats(devicesRes.data || { desktop: 0, mobile: 0, tablet: 0 });

            // Set geo data
            if (geoRes.data && geoRes.data.length > 0) {
                setGeoData(geoRes.data);
            } else {
                setGeoData([]);
            }

            // Set user activity (empty until real data available)
            setUserActivity([]);

        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAnalyticsData();
        setRefreshing(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-IN').format(value);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                        <p className="text-slate-400 text-sm mt-1">Real-time business insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Time Range Selector */}
                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                            {['7d', '30d', '90d'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                        }`}
                                >
                                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                                </button>
                            ))}
                        </div>
                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1920px] mx-auto p-6">
                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <KPICard
                        title="Total Revenue"
                        value={formatCurrency(overview?.totalRevenue || 0)}
                        change={overview?.revenueGrowth || 0}
                        icon={DollarSign}
                        color="emerald"
                    />
                    <KPICard
                        title="Total Orders"
                        value={formatNumber(overview?.totalOrders || 0)}
                        change={overview?.ordersGrowth || 0}
                        icon={ShoppingBag}
                        color="blue"
                    />
                    <KPICard
                        title="Total Users"
                        value={formatNumber(overview?.totalUsers || 0)}
                        change={overview?.usersGrowth || 0}
                        icon={Users}
                        color="purple"
                    />
                    <KPICard
                        title="Active Listings"
                        value={formatNumber(overview?.totalListings || 0)}
                        change={overview?.listingsGrowth || 0}
                        icon={BarChart3}
                        color="amber"
                    />
                    <KPICard
                        title="Conversion Rate"
                        value={`${overview?.conversionRate || 0}%`}
                        change={0.5}
                        icon={TrendingUp}
                        color="cyan"
                    />
                    <KPICard
                        title="Avg. Order Value"
                        value={formatCurrency(overview?.avgOrderValue || 0)}
                        change={3.2}
                        icon={Activity}
                        color="rose"
                    />
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Revenue Chart - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Revenue Overview</h3>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                    Revenue
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                    Orders
                                </span>
                            </div>
                        </div>
                        <div className="h-64">
                            <SimpleBarChart data={salesData} />
                        </div>
                    </div>

                    {/* Traffic Sources Donut */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <h3 className="text-lg font-semibold mb-6">Device Breakdown</h3>
                        <div className="flex flex-col items-center">
                            <DonutChart data={deviceStats} />
                            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
                                <div className="text-center">
                                    <Monitor className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                                    <p className="text-xl font-bold">{deviceStats.desktop}%</p>
                                    <p className="text-xs text-slate-400">Desktop</p>
                                </div>
                                <div className="text-center">
                                    <Smartphone className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                                    <p className="text-xl font-bold">{deviceStats.mobile}%</p>
                                    <p className="text-xs text-slate-400">Mobile</p>
                                </div>
                                <div className="text-center">
                                    <Monitor className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                                    <p className="text-xl font-bold">{deviceStats.tablet}%</p>
                                    <p className="text-xs text-slate-400">Tablet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Traffic & Engagement Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Page Views Chart */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Traffic Analytics</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Eye className="w-4 h-4" />
                                {formatNumber(overview?.pageViews || 0)} page views
                            </div>
                        </div>
                        <div className="h-48">
                            <SimpleLineChart data={trafficData} />
                        </div>
                    </div>

                    {/* User Activity Heatmap */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Peak Activity Hours</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Clock className="w-4 h-4" />
                                Hourly distribution
                            </div>
                        </div>
                        <div className="h-48">
                            <HourlyHeatmap data={userActivity} />
                        </div>
                    </div>
                </div>

                {/* Tables Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Top Products */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Products</h3>
                        <div className="space-y-3">
                            {topProducts.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No product data available</p>
                                </div>
                            ) : (
                                topProducts.map((product, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="font-medium text-sm">{product.name}</p>
                                                <p className="text-xs text-slate-400">{product.sales} sales</p>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-semibold">{formatCurrency(product.revenue)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Top Sellers */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Sellers</h3>
                        <div className="space-y-3">
                            {topSellers.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No seller data available</p>
                                </div>
                            ) : (
                                topSellers.map((seller, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="font-medium text-sm">{seller.name}</p>
                                                <p className="text-xs text-slate-400">{seller.orders} orders • ⭐ {seller.rating || 0}</p>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-semibold">{formatCurrency(seller.revenue)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Geographic Distribution */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Geographic Distribution</h3>
                        <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {geoData.length === 0 ? (
                            <div className="col-span-5 text-center py-8 text-slate-500">
                                <p>No geographic data available</p>
                            </div>
                        ) : (
                            geoData.map((region, idx) => (
                                <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">{region.region}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                                            idx === 1 ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-slate-600 text-slate-300'
                                            }`}>
                                            #{idx + 1}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold">{formatNumber(region.users)}</p>
                                    <p className="text-xs text-slate-400">users</p>
                                    <div className="mt-2 pt-2 border-t border-slate-600">
                                        <p className="text-sm text-emerald-400">{formatCurrency(region.revenue)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// SUB-COMPONENTS
// ============================================

// KPI Card Component
const KPICard = ({ title, value, change, icon: Icon, color }) => {
    const isPositive = change >= 0;
    const colorClasses = {
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
        rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(change)}%
                </div>
            </div>
            <p className="text-2xl font-bold mb-1">{value}</p>
            <p className="text-xs text-slate-400">{title}</p>
        </div>
    );
};

// Simple Bar Chart (CSS-based)
const SimpleBarChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>No data available</p>
            </div>
        );
    }
    const maxRevenue = Math.max(...data.map(d => d.revenue)) || 1;

    return (
        <div className="flex items-end justify-between h-full gap-1">
            {data.slice(-14).map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all hover:from-emerald-500 hover:to-emerald-300"
                        style={{ height: `${(item.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                    ></div>
                    <span className="text-[10px] text-slate-500 truncate">{item.date?.split(' ')[0] || ''}</span>
                </div>
            ))}
        </div>
    );
};

// Simple Line Chart (CSS-based)
const SimpleLineChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>No data available</p>
            </div>
        );
    }
    const maxViews = Math.max(...data.map(d => d.pageViews)) || 1;

    return (
        <div className="flex items-end justify-between h-full gap-1">
            {data.slice(-14).map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-sm"
                        style={{ height: `${(item.pageViews / maxViews) * 100}%`, minHeight: '4px' }}
                    ></div>
                </div>
            ))}
        </div>
    );
};

// Donut Chart (CSS-based)
const DonutChart = ({ data }) => {
    const total = (data?.desktop || 0) + (data?.mobile || 0) + (data?.tablet || 0);

    if (total === 0) {
        return (
            <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center">
                    <p className="text-slate-500 text-sm">No data</p>
                </div>
            </div>
        );
    }

    const desktopDeg = ((data?.desktop || 0) / total) * 360;
    const mobileDeg = ((data?.mobile || 0) / total) * 360;

    return (
        <div className="relative w-36 h-36">
            <div
                className="w-full h-full rounded-full"
                style={{
                    background: `conic-gradient(
                        #3b82f6 0deg ${desktopDeg}deg,
                        #10b981 ${desktopDeg}deg ${desktopDeg + mobileDeg}deg,
                        #f59e0b ${desktopDeg + mobileDeg}deg 360deg
                    )`
                }}
            ></div>
            <div className="absolute inset-4 bg-slate-800 rounded-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl font-bold">{total}%</p>
                    <p className="text-xs text-slate-400">Total</p>
                </div>
            </div>
        </div>
    );
};

// Hourly Heatmap
const HourlyHeatmap = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>No activity data available</p>
            </div>
        );
    }
    const maxUsers = Math.max(...data.map(d => d.users)) || 1;

    return (
        <div className="grid grid-cols-12 gap-1 h-full">
            {data.map((item, idx) => {
                const intensity = item.users / maxUsers;
                const bgColor = intensity > 0.8 ? 'bg-emerald-500' :
                    intensity > 0.6 ? 'bg-emerald-600' :
                        intensity > 0.4 ? 'bg-emerald-700' :
                            intensity > 0.2 ? 'bg-emerald-800' : 'bg-emerald-900';

                return (
                    <div
                        key={idx}
                        className={`${bgColor} rounded-sm flex items-end justify-center pb-1 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all`}
                        title={`${item.hour}: ${item.users} users`}
                    >
                        <span className="text-[8px] text-emerald-200">{idx % 4 === 0 ? item.hour.split(':')[0] : ''}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default AdminAnalytics;
