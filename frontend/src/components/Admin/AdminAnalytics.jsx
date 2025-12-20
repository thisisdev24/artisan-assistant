import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/apiClient';
import {
    TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign,
    BarChart3, PieChart, Activity, Eye, MousePointer, Clock,
    Globe, Smartphone, Monitor, Tablet, ArrowUpRight, ArrowDownRight,
    RefreshCw, Calendar, Filter, Download, AlertCircle, Maximize2,
    ChevronDown, X, ArrowLeft, Layers, Zap, Target
} from 'lucide-react';

// ============================================
// POWER BI STYLE ADMIN ANALYTICS DASHBOARD
// Theme: ArtistPoint Orange/Yellow
// ============================================

const AdminAnalytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [fullscreenChart, setFullscreenChart] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Analytics Data States
    const [overview, setOverview] = useState(null);
    const [trafficData, setTrafficData] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [topSellers, setTopSellers] = useState([]);
    const [deviceStats, setDeviceStats] = useState({});
    const [geoData, setGeoData] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);

    const loadAnalyticsData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                overviewRes,
                trafficRes,
                salesRes,
                topProductsRes,
                topSellersRes,
                devicesRes,
                geoRes,
                hourlyRes
            ] = await Promise.all([
                apiClient.get(`/api/analytics/overview?range=${timeRange}`).catch(e => ({ data: null })),
                apiClient.get(`/api/analytics/traffic?range=${timeRange}`).catch(e => ({ data: [] })),
                apiClient.get(`/api/analytics/sales?range=${timeRange}`).catch(e => ({ data: [] })),
                apiClient.get('/api/analytics/top-products?limit=5').catch(e => ({ data: [] })),
                apiClient.get('/api/analytics/top-sellers?limit=5').catch(e => ({ data: [] })),
                apiClient.get('/api/analytics/devices').catch(e => ({ data: { desktop: 33, mobile: 60, tablet: 7 } })),
                apiClient.get('/api/analytics/geo').catch(e => ({ data: [] })),
                apiClient.get('/api/analytics/hourly').catch(e => ({ data: [] })),
            ]);

            if (overviewRes.data) {
                setOverview(overviewRes.data);
            }

            if (trafficRes.data?.length > 0) {
                setTrafficData(trafficRes.data.map(t => ({
                    date: new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    pageViews: t.pageViews || 0,
                    visitors: t.visitors || 0,
                    sessions: t.sessions || 0,
                })));
            } else {
                setTrafficData([]);
            }

            if (salesRes.data?.length > 0) {
                setSalesData(salesRes.data.map(s => ({
                    date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    revenue: s.revenue || 0,
                    orders: s.orders || 0,
                })));
            } else {
                setSalesData([]);
            }

            setTopProducts(topProductsRes.data || []);
            setTopSellers(topSellersRes.data || []);
            setDeviceStats(devicesRes.data || { desktop: 0, mobile: 0, tablet: 0 });
            setGeoData(geoRes.data || []);
            setHourlyData(hourlyRes.data || []);

        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        loadAnalyticsData();
    }, [loadAnalyticsData]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(loadAnalyticsData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, loadAnalyticsData]);

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
        }).format(value || 0);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-IN').format(value || 0);
    };

    const exportCSV = () => {
        const data = salesData.map(s => `${s.date},${s.revenue},${s.orders}`).join('\n');
        const csv = `Date,Revenue,Orders\n${data}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-orange-600 font-medium text-lg">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
            {/* Fullscreen Chart Modal */}
            {fullscreenChart && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[80vh] p-6 relative">
                        <button
                            onClick={() => setFullscreenChart(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{fullscreenChart.title}</h2>
                        <div className="h-[calc(100%-80px)]">
                            {fullscreenChart.component}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 to-amber-400 shadow-lg">
                <div className="max-w-[1920px] mx-auto px-6 py-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <a href="/Admin" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </a>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                                    <BarChart3 className="w-8 h-8" />
                                    Analytics Dashboard
                                </h1>
                                <p className="text-orange-100 text-sm mt-1">Real-time business insights • Power BI Style</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showFilters ? 'bg-white text-orange-600' : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>

                            {/* Time Range */}
                            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg p-1">
                                {['7d', '30d', '90d'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${timeRange === range
                                                ? 'bg-white text-orange-600 shadow-md'
                                                : 'text-white hover:bg-white/20'
                                            }`}
                                    >
                                        {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                                    </button>
                                ))}
                            </div>

                            {/* Auto Refresh Toggle */}
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${autoRefresh ? 'bg-green-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                title="Auto-refresh every 30 seconds"
                            >
                                <Zap className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                                {autoRefresh ? 'Live' : 'Auto'}
                            </button>

                            {/* Export */}
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white hover:bg-white/30 rounded-lg font-medium transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>

                            {/* Refresh */}
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-all shadow-md"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div>
                                    <label className="text-white text-sm font-medium mb-1 block">Category</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="px-4 py-2 rounded-lg bg-white text-gray-800 font-medium min-w-[150px]"
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="paintings">Paintings</option>
                                        <option value="jewelry">Jewelry</option>
                                        <option value="textiles">Textiles</option>
                                        <option value="ceramics">Ceramics</option>
                                        <option value="woodcraft">Woodcraft</option>
                                    </select>
                                </div>
                                <div className="text-white/60 text-sm">
                                    More filters coming soon...
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1920px] mx-auto p-6">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <KPICard
                        title="Total Revenue"
                        value={formatCurrency(overview?.totalRevenue)}
                        change={overview?.revenueGrowth || 0}
                        icon={DollarSign}
                        color="emerald"
                        sparkData={salesData.slice(-7).map(s => s.revenue)}
                    />
                    <KPICard
                        title="Total Orders"
                        value={formatNumber(overview?.totalOrders)}
                        change={overview?.ordersGrowth || 0}
                        icon={ShoppingBag}
                        color="blue"
                        sparkData={salesData.slice(-7).map(s => s.orders)}
                    />
                    <KPICard
                        title="Total Users"
                        value={formatNumber(overview?.totalUsers)}
                        change={overview?.usersGrowth || 0}
                        icon={Users}
                        color="purple"
                    />
                    <KPICard
                        title="Active Listings"
                        value={formatNumber(overview?.totalListings)}
                        change={overview?.listingsGrowth || 0}
                        icon={Layers}
                        color="amber"
                    />
                    <KPICard
                        title="Conversion Rate"
                        value={`${overview?.conversionRate || 0}%`}
                        change={1.2}
                        icon={Target}
                        color="cyan"
                    />
                    <KPICard
                        title="Avg. Order Value"
                        value={formatCurrency(overview?.avgOrderValue)}
                        change={2.8}
                        icon={Activity}
                        color="rose"
                    />
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Revenue Chart - 2 columns */}
                    <ChartCard
                        title="Revenue Overview"
                        subtitle="Revenue & Orders trend"
                        colSpan={2}
                        onFullscreen={() => setFullscreenChart({
                            title: 'Revenue Overview',
                            component: <RevenueBarChart data={salesData} height="100%" />
                        })}
                    >
                        <div className="flex items-center gap-4 mb-4 text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400"></span>
                                Revenue
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                Orders
                            </span>
                        </div>
                        <RevenueBarChart data={salesData} />
                    </ChartCard>

                    {/* Device Donut */}
                    <ChartCard title="Device Breakdown" subtitle="Traffic by device type">
                        <div className="flex flex-col items-center">
                            <DonutChart data={deviceStats} />
                            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
                                <DeviceStat icon={Monitor} label="Desktop" value={deviceStats.desktop} color="blue" />
                                <DeviceStat icon={Smartphone} label="Mobile" value={deviceStats.mobile} color="emerald" />
                                <DeviceStat icon={Tablet} label="Tablet" value={deviceStats.tablet} color="amber" />
                            </div>
                        </div>
                    </ChartCard>
                </div>

                {/* Traffic & Activity Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Traffic Chart */}
                    <ChartCard
                        title="Traffic Analytics"
                        subtitle={`${formatNumber(overview?.pageViews || 0)} page views`}
                        icon={Eye}
                        onFullscreen={() => setFullscreenChart({
                            title: 'Traffic Analytics',
                            component: <AreaChart data={trafficData} height="100%" />
                        })}
                    >
                        <AreaChart data={trafficData} />
                    </ChartCard>

                    {/* Hourly Heatmap */}
                    <ChartCard
                        title="Peak Activity Hours"
                        subtitle="Hourly user distribution"
                        icon={Clock}
                    >
                        <HourlyHeatmap data={hourlyData} />
                    </ChartCard>
                </div>

                {/* Tables Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Top Products */}
                    <ChartCard title="Top Products" subtitle="By revenue">
                        <div className="space-y-3">
                            {topProducts.length === 0 ? (
                                <EmptyState message="No product data available" />
                            ) : (
                                topProducts.map((product, idx) => (
                                    <ProductRow
                                        key={idx}
                                        rank={idx + 1}
                                        name={product.name}
                                        sales={product.sales}
                                        revenue={formatCurrency(product.revenue)}
                                        category={product.category}
                                    />
                                ))
                            )}
                        </div>
                    </ChartCard>

                    {/* Top Sellers */}
                    <ChartCard title="Top Sellers" subtitle="By revenue">
                        <div className="space-y-3">
                            {topSellers.length === 0 ? (
                                <EmptyState message="No seller data available" />
                            ) : (
                                topSellers.map((seller, idx) => (
                                    <SellerRow
                                        key={idx}
                                        rank={idx + 1}
                                        name={seller.name}
                                        orders={seller.orders}
                                        revenue={formatCurrency(seller.revenue)}
                                        rating={seller.rating}
                                    />
                                ))
                            )}
                        </div>
                    </ChartCard>
                </div>

                {/* Geographic Distribution */}
                <ChartCard title="Geographic Distribution" subtitle="Users & Revenue by region" icon={Globe} className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {geoData.length === 0 ? (
                            <div className="col-span-5">
                                <EmptyState message="No geographic data available" />
                            </div>
                        ) : (
                            geoData.map((region, idx) => (
                                <GeoCard
                                    key={idx}
                                    rank={idx + 1}
                                    region={region.region}
                                    users={formatNumber(region.users)}
                                    revenue={formatCurrency(region.revenue)}
                                />
                            ))
                        )}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};

// ============================================
// SUB-COMPONENTS
// ============================================

// KPI Card with sparkline
const KPICard = ({ title, value, change, icon: Icon, color, sparkData }) => {
    const isPositive = change >= 0;
    const colorMap = {
        emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200' },
        blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200' },
        purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-200' },
        amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-200' },
        cyan: { bg: 'bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-200' },
        rose: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', border: 'border-rose-200' },
    };
    const colors = colorMap[color] || colorMap.amber;

    return (
        <div className={`${colors.bg} rounded-xl border ${colors.border} p-4 hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${colors.icon} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(change)}%
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
            <p className="text-xs text-gray-500 font-medium">{title}</p>
            {sparkData && sparkData.length > 0 && (
                <div className="mt-3 h-8">
                    <Sparkline data={sparkData} color={color} />
                </div>
            )}
        </div>
    );
};

// Sparkline mini chart
const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data) || 1;
    const min = Math.min(...data);
    const range = max - min || 1;

    const colorClass = {
        emerald: 'stroke-emerald-500',
        blue: 'stroke-blue-500',
        purple: 'stroke-purple-500',
        amber: 'stroke-amber-500',
    }[color] || 'stroke-amber-500';

    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                className={colorClass}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

// Chart Card wrapper
const ChartCard = ({ title, subtitle, icon: Icon, children, colSpan = 1, onFullscreen, className = '' }) => (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow ${colSpan === 2 ? 'lg:col-span-2' : ''} ${className}`}>
        <div className="flex items-center justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 text-orange-500" />}
                    {title}
                </h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {onFullscreen && (
                <button
                    onClick={onFullscreen}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View fullscreen"
                >
                    <Maximize2 className="w-4 h-4 text-gray-400" />
                </button>
            )}
        </div>
        {children}
    </div>
);

// Revenue Bar Chart (CSS-based)
const RevenueBarChart = ({ data, height = "h-64" }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No revenue data available" />;
    }
    const maxRevenue = Math.max(...data.map(d => d.revenue)) || 1;

    return (
        <div className={`flex items-end justify-between gap-1 ${typeof height === 'string' && height.startsWith('h-') ? height : ''}`} style={typeof height === 'string' && !height.startsWith('h-') ? { height } : {}}>
            {data.slice(-14).map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex flex-col items-center">
                        {/* Tooltip */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            <div className="font-semibold">{item.date}</div>
                            <div>Revenue: ₹{(item.revenue || 0).toLocaleString('en-IN')}</div>
                            <div>Orders: {item.orders || 0}</div>
                        </div>
                        <div
                            className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-md transition-all duration-300 hover:from-orange-400 hover:to-amber-300 cursor-pointer"
                            style={{ height: `${Math.max((item.revenue / maxRevenue) * 200, 4)}px` }}
                        ></div>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate w-full text-center">{item.date?.split(' ')[0] || ''}</span>
                </div>
            ))}
        </div>
    );
};

// Area Chart
const AreaChart = ({ data, height = "h-48" }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No traffic data available" />;
    }
    const maxViews = Math.max(...data.map(d => d.pageViews)) || 1;

    return (
        <div className={`relative ${typeof height === 'string' && height.startsWith('h-') ? height : ''}`} style={typeof height === 'string' && !height.startsWith('h-') ? { height } : {}}>
            <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                    d={`M0,50 ${data.map((d, i) => `L${(i / (data.length - 1)) * 100},${50 - (d.pageViews / maxViews) * 45}`).join(' ')} L100,50 Z`}
                    fill="url(#areaGradient)"
                />
                {/* Line */}
                <path
                    d={`M0,${50 - (data[0]?.pageViews / maxViews) * 45} ${data.map((d, i) => `L${(i / (data.length - 1)) * 100},${50 - (d.pageViews / maxViews) * 45}`).join(' ')}`}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="0.5"
                />
            </svg>
        </div>
    );
};

// Donut Chart
const DonutChart = ({ data }) => {
    const total = (data?.desktop || 0) + (data?.mobile || 0) + (data?.tablet || 0);

    if (total === 0) {
        return (
            <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No data</p>
            </div>
        );
    }

    const desktopDeg = ((data?.desktop || 0) / total) * 360;
    const mobileDeg = ((data?.mobile || 0) / total) * 360;

    return (
        <div className="relative w-40 h-40 group">
            <div
                className="w-full h-full rounded-full transition-transform group-hover:scale-105"
                style={{
                    background: `conic-gradient(
                        #3b82f6 0deg ${desktopDeg}deg,
                        #10b981 ${desktopDeg}deg ${desktopDeg + mobileDeg}deg,
                        #f59e0b ${desktopDeg + mobileDeg}deg 360deg
                    )`
                }}
            ></div>
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">100%</p>
                    <p className="text-xs text-gray-500">Total</p>
                </div>
            </div>
        </div>
    );
};

// Device Stat
const DeviceStat = ({ icon: Icon, label, value, color }) => {
    const colorClass = {
        blue: 'text-blue-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500',
    }[color] || 'text-gray-500';

    return (
        <div className="text-center">
            <Icon className={`w-5 h-5 mx-auto ${colorClass} mb-1`} />
            <p className="text-xl font-bold text-gray-800">{value || 0}%</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
};

// Hourly Heatmap
const HourlyHeatmap = ({ data }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No activity data available" />;
    }
    const maxUsers = Math.max(...data.map(d => d.users || d.sessions || 0)) || 1;

    return (
        <div className="grid grid-cols-12 gap-1 h-32">
            {data.slice(0, 24).map((item, idx) => {
                const intensity = (item.users || item.sessions || 0) / maxUsers;
                const bgColor = intensity > 0.8 ? 'bg-orange-500' :
                    intensity > 0.6 ? 'bg-orange-400' :
                        intensity > 0.4 ? 'bg-orange-300' :
                            intensity > 0.2 ? 'bg-orange-200' :
                                intensity > 0 ? 'bg-orange-100' : 'bg-gray-100';

                return (
                    <div
                        key={idx}
                        className={`${bgColor} rounded-md flex items-end justify-center pb-1 cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all group relative`}
                        title={`${item.hour}: ${item.users || item.sessions || 0} users`}
                    >
                        <span className="text-[8px] text-gray-600">{idx % 4 === 0 ? item.hour?.split(':')[0] || idx : ''}</span>
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {item.hour}: {item.users || item.sessions || 0}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Product Row
const ProductRow = ({ rank, name, sales, revenue, category }) => (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl hover:shadow-md transition-all group cursor-pointer">
        <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 text-white flex items-center justify-center text-sm font-bold shadow-md">
                {rank}
            </span>
            <div>
                <p className="font-medium text-gray-800 text-sm group-hover:text-orange-600 transition-colors">{name}</p>
                <p className="text-xs text-gray-500">{sales} sales • {category}</p>
            </div>
        </div>
        <span className="text-emerald-600 font-bold">{revenue}</span>
    </div>
);

// Seller Row
const SellerRow = ({ rank, name, orders, revenue, rating }) => (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all group cursor-pointer">
        <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-white flex items-center justify-center text-sm font-bold shadow-md">
                {rank}
            </span>
            <div>
                <p className="font-medium text-gray-800 text-sm group-hover:text-purple-600 transition-colors">{name}</p>
                <p className="text-xs text-gray-500">{orders} orders • ⭐ {rating}</p>
            </div>
        </div>
        <span className="text-emerald-600 font-bold">{revenue}</span>
    </div>
);

// Geo Card
const GeoCard = ({ rank, region, users, revenue }) => (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">{region}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rank === 1 ? 'bg-emerald-100 text-emerald-700' :
                    rank === 2 ? 'bg-blue-100 text-blue-700' :
                        rank === 3 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                }`}>
                #{rank}
            </span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{users}</p>
        <p className="text-xs text-gray-500">users</p>
        <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-sm text-emerald-600 font-semibold">{revenue}</p>
        </div>
    </div>
);

// Empty State
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">{message}</p>
    </div>
);

export default AdminAnalytics;
