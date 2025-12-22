import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    Users, Store, Package, ShoppingCart, TrendingUp, TrendingDown,
    DollarSign, Eye, ArrowUpRight
} from 'lucide-react';
import AdminChat from './AdminChat';

// Helper to extract image URL from various formats
const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.large || img.thumb || img.hi_res || img.variant || img.url || null;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentOrders, setRecentOrders] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/admin/stats');
            setStats(res.data);

            // Try to load recent orders
            try {
                const ordersRes = await apiClient.get('/api/admin/orders?limit=5');
                setRecentOrders(ordersRes.data?.orders || []);
            } catch (e) { }

            // Try to load top products
            try {
                const prodRes = await apiClient.get('/api/admin/listings?limit=5');
                setTopProducts(prodRes.data?.listings || prodRes.data || []);
            } catch (e) { }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                            <div className="w-9 h-9 bg-gray-100 rounded-lg mb-4" />
                            <div className="w-16 h-8 bg-gray-100 rounded mb-2" />
                            <div className="w-20 h-4 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.users || 0, icon: Users, trend: 12, color: 'bg-blue-50 text-blue-600' },
        { label: 'Total Sellers', value: stats?.sellers || 0, icon: Store, trend: 8, color: 'bg-purple-50 text-purple-600' },
        { label: 'Total Products', value: stats?.listings || 0, icon: Package, trend: 15, color: 'bg-amber-50 text-amber-600' },
        { label: 'Total Orders', value: stats?.orders || 0, icon: ShoppingCart, trend: 22, color: 'bg-emerald-50 text-emerald-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                {card.trend !== 0 && (
                                    <span className={`text-xs font-medium flex items-center gap-1 ${card.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {card.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(card.trend)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-semibold text-gray-900">{card.value.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">{card.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickLink
                    title="Manage Users"
                    description="View and manage all users"
                    onClick={() => navigate('/admin/users')}
                />
                <QuickLink
                    title="Manage Sellers"
                    description="View seller accounts"
                    onClick={() => navigate('/admin/sellers')}
                />
                <QuickLink
                    title="Products"
                    description="Review product listings"
                    onClick={() => navigate('/admin/products')}
                />
                <QuickLink
                    title="Analytics"
                    description="View detailed reports"
                    onClick={() => navigate('/admin/reports')}
                />
            </div>

            {/* Dashboard Grid with Chat */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Activity */}
                    <div className="grid gap-6">
                        {/* Recent Orders */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                                <button className="text-sm text-gray-500 hover:text-gray-900">View all</button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {recentOrders.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">No recent orders</div>
                                ) : (
                                    recentOrders.slice(0, 5).map(order => (
                                        <div key={order._id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">#{order._id.slice(-8)}</p>
                                                <p className="text-xs text-gray-500">{order.user?.name || 'Guest'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-sm text-gray-900">₹{order.total || 0}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                                                    order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                                        'bg-amber-50 text-amber-700'
                                                    }`}>{order.status || 'pending'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Top Products</h2>
                                <button onClick={() => navigate('/admin/products')} className="text-sm text-gray-500 hover:text-gray-900">View all</button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {topProducts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">No products</div>
                                ) : (
                                    topProducts.slice(0, 5).map(product => (
                                        <div key={product._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                {getImageUrl(product.images?.[0]) ? (
                                                    <img src={getImageUrl(product.images?.[0])} alt="" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Package className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-gray-900 truncate">{product.title || 'Untitled'}</p>
                                                <p className="text-xs text-gray-500">₹{product.price || 0}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Eye className="w-3 h-3" />
                                                {product.views || 0}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chat */}
                <div className="lg:col-span-1">
                    <AdminChat />
                </div>
            </div>
        </div>
    );
};

const QuickLink = ({ title, description, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all group"
    >
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
        <p className="text-sm text-gray-500">{description}</p>
    </button>
);

export default Dashboard;
