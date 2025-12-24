import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    ArrowLeft, Mail, Phone, Calendar, MapPin, ShoppingBag, Heart, Star,
    BadgeCheck, Key, Activity, Download, AlertTriangle, TrendingUp,
    Gift, Bell, LogIn, Tag, Shield, Ban, Trash2, MessageSquare, CheckCircle, AlertCircle, Clock, CreditCard
} from 'lucide-react';
import { OrdersTab, AddressesTab, ReviewsTab, WishlistTab, ActivityTab, NotesTab, StatusHistoryTab } from './UserDetailsTabs';

const UserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [stats, setStats] = useState({ orderCount: 0, totalSpent: 0, avgOrderValue: 0, wishlistCount: 0, reviewCount: 0 });
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [activeTab, setActiveTab] = useState(tabFromUrl || 'orders');
    const [activityLog, setActivityLog] = useState([]);
    const [favoriteCategories, setFavoriteCategories] = useState([]);
    const [creditAmount, setCreditAmount] = useState('');
    const [showCreditModal, setShowCreditModal] = useState(false);

    useEffect(() => {
        loadUserData();
    }, [id]);

    useEffect(() => {
        if (tabFromUrl) setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    // Helper: Relative time formatter
    const formatRelativeTime = (date) => {
        const now = new Date();
        const d = new Date(date);
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        return d.toLocaleDateString();
    };

    const loadUserData = async () => {
        setLoading(true);
        try {
            const [
                statsResult,
                ordersResult,
                addressesResult,
                reviewsResult,
                wishlistResult,
                notesResult,
                activityResult
            ] = await Promise.allSettled([
                apiClient.get(`/api/admin/users/${id}/stats`),
                apiClient.get(`/api/admin/users/${id}/orders`),
                apiClient.get(`/api/admin/users/${id}/addresses`),
                apiClient.get(`/api/admin/users/${id}/reviews`),
                apiClient.get(`/api/admin/users/${id}/wishlist`),
                apiClient.get(`/api/admin/users/${id}/notes`),
                apiClient.get(`/api/admin/users/${id}/activity`)
            ]);

            // Handle Stats & User Info (Critical)
            if (statsResult.status === 'fulfilled') {
                setUser(statsResult.value.data.user);
                setStats(statsResult.value.data.stats);
            } else {
                console.error("Failed to load user stats", statsResult.reason);
            }

            // Handle Orders
            if (ordersResult.status === 'fulfilled') {
                const ordersData = ordersResult.value.data || [];
                setOrders(ordersData);

                // Calculate Favorite Categories
                const categories = {};
                ordersData.forEach(order => {
                    order.items?.forEach(item => {
                        const cat = item.category || 'General';
                        categories[cat] = (categories[cat] || 0) + 1;
                    });
                });
                const sortedCats = Object.entries(categories)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, count]) => ({ name, count }));
                setFavoriteCategories(sortedCats);
            }

            // Handle Addresses
            if (addressesResult.status === 'fulfilled') {
                setAddresses(addressesResult.value.data || []);
            }

            // Handle Reviews
            if (reviewsResult.status === 'fulfilled') {
                setReviews(reviewsResult.value.data || []);
            }

            // Handle Wishlist
            if (wishlistResult.status === 'fulfilled') {
                setWishlist(wishlistResult.value.data || []);
            }

            // Handle Notes
            if (notesResult.status === 'fulfilled') {
                setNotes(notesResult.value.data || []);
            }

            // Handle Activity
            if (activityResult.status === 'fulfilled') {
                setActivityLog(activityResult.value.data || []);
            }

        } catch (err) {
            console.error('Critical error loading user data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status, isOnline) => {
        if (status === 'blocked') return 'bg-red-500';
        if (status === 'inactive') return 'bg-gray-400';
        if (status === 'active' && isOnline) return 'bg-green-500';
        if (status === 'active') return 'bg-amber-500';
        return 'bg-gray-400';
    };

    const getSpendingTier = (totalSpent) => {
        if (totalSpent >= 50000) return { tier: 'Gold', color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: '🥇' };
        if (totalSpent >= 10000) return { tier: 'Silver', color: 'bg-gray-100 text-gray-700 border border-gray-200', icon: '🥈' };
        return { tier: 'Bronze', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: '🥉' };
    };

    const getChurnRisk = () => {
        if (!user?.lastLogin) return { level: 'high', label: 'At Risk', color: 'bg-red-50 text-red-700 border border-red-200', description: 'Never logged in' };
        const daysSinceLogin = Math.floor((Date.now() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24));
        if (daysSinceLogin > 60) return { level: 'high', label: 'At Risk', color: 'bg-red-50 text-red-700 border border-red-200', description: `Inactive ${daysSinceLogin} days` };
        if (daysSinceLogin > 30) return { level: 'medium', label: 'Warning', color: 'bg-amber-50 text-amber-700 border border-amber-200', description: `Inactive ${daysSinceLogin} days` };
        return { level: 'low', label: 'Active', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', description: `Active ${daysSinceLogin} days ago` };
    };

    const getCustomerLifetimeValue = () => {
        const monthsActive = Math.max(1, Math.floor((Date.now() - new Date(user?.createdAt)) / (1000 * 60 * 60 * 24 * 30)));
        const avgMonthlySpend = (stats.totalSpent || 0) / monthsActive;
        const predictedYearlyValue = avgMonthlySpend * 12;
        return Math.round(predictedYearlyValue);
    };

    const blockUser = async () => {
        if (!window.confirm(user.status === 'blocked' ? 'Unblock this user?' : 'Block this user?')) return;
        try {
            await apiClient.put(`/api/admin/users/${id}/block`, { blocked: user.status !== 'blocked' });
            loadUserData();
        } catch (err) {
            alert('Failed');
        }
    };

    const deleteUser = async () => {
        if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
        try {
            await apiClient.delete(`/api/admin/users/${id}`);
            navigate('/admin/users');
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const resetPassword = async () => {
        if (!window.confirm('Send password reset email to this user?')) return;
        try {
            await apiClient.post(`/api/admin/users/${id}/reset-password`);
            alert('Password reset email sent!');
        } catch (err) {
            alert('Failed to send reset email');
        }
    };

    const sendNotification = async () => {
        const message = prompt('Enter notification message:');
        if (!message) return;
        try {
            await apiClient.post(`/api/admin/users/${id}/notify`, { message });
            alert('Notification sent!');
        } catch (err) {
            alert('Failed to send notification');
        }
    };

    const giftCredit = async () => {
        if (!creditAmount || isNaN(creditAmount)) return;
        try {
            await apiClient.post(`/api/admin/users/${id}/credit`, { amount: parseFloat(creditAmount) });
            alert(`₹${creditAmount} credit added!`);
            setShowCreditModal(false);
            setCreditAmount('');
            loadUserData();
        } catch (err) {
            alert('Failed to add credit');
        }
    };

    const exportUserData = async () => {
        try {
            const data = {
                user,
                stats,
                orders,
                addresses,
                reviews,
                wishlist,
                exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `user_${user.name.replace(/\s+/g, '_')}_${id}.json`;
            a.click();
        } catch (err) {
            alert('Export failed');
        }
    };

    const impersonateUser = async () => {
        if (!window.confirm('Login as this user? You will be redirected to their view.')) return;
        try {
            await apiClient.post(`/api/admin/users/${id}/impersonate`);
            alert('Impersonation mode activated (demo)');
        } catch (err) {
            alert('Impersonation not available');
        }
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        try {
            const res = await apiClient.post(`/api/admin/users/${id}/notes`, { content: newNote });
            setNotes(prev => [res.data.note, ...prev]);
            setNewNote('');
        } catch (err) {
            alert('Failed to add note');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="animate-pulse">
                        <div className="h-6 w-24 bg-gray-100 rounded mb-8" />
                        <div className="border border-gray-200 rounded-2xl p-8 mb-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-gray-100 rounded-full" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-7 w-48 bg-gray-100 rounded" />
                                    <div className="h-4 w-64 bg-gray-100 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
                    <button onClick={() => navigate('/admin/users')} className="text-gray-600 hover:text-gray-900">
                        ← Back to Users
                    </button>
                </div>
            </div>
        );
    }

    const spendingTier = getSpendingTier(stats.totalSpent || 0);
    const churnRisk = getChurnRisk();
    const clv = getCustomerLifetimeValue();
    const tabs = ['orders', 'addresses', 'reviews', 'wishlist', 'activity', 'notes', 'status history'];

    return (
        <div className="space-y-6">
            {/* Credit Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gift Store Credit</h3>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl text-gray-500">₹</span>
                            <input
                                type="number"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                placeholder="Amount"
                                className="flex-1 text-2xl font-semibold border-b-2 border-gray-900 outline-none py-2 bg-transparent"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={giftCredit} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Add Credit</button>
                            <button onClick={() => setShowCreditModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back Button */}
            <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Users
            </button>

            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-100 to-indigo-100 relative group">
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="px-6 pb-2">
                    <div className="flex flex-col lg:flex-row gap-6 -mt-12 mb-6 relative z-10">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl bg-white p-1 shadow-lg border-2 border-white overflow-hidden">
                                <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white text-3xl font-bold rounded-lg">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 pt-2 lg:pt-14">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                        {user.emailVerified && <BadgeCheck className="w-6 h-6 text-blue-500" />}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${user.isOnline ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {user.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-3 max-w-xl flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${spendingTier.color}`}>{spendingTier.icon} {spendingTier.tier} Tier</span>
                                        <span className={`px-2 py-0.5 rounded text-xs border ${churnRisk.color}`}>{churnRisk.label}</span>
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${user.email_verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} title={user.email_verified ? 'Verified' : 'Email not verified'}>
                                            <Mail className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[180px]">{user.email}</span>
                                            {user.email_verified ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                                        </div>
                                        {user.phone && (
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${user.phone_verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} title={user.phone_verified ? 'Verified' : 'Phone not verified'}>
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>{user.phone}</span>
                                                {user.phone_verified ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                                            </div>
                                        )}
                                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> Joined: {new Date(user.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> Active: {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'Never'}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side actions & Stats */}
                                <div className="flex flex-col gap-4 items-end">
                                    <div className="flex gap-2">
                                        <button onClick={() => window.location.href = `mailto:${user.email}`} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Send Email">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button onClick={sendNotification} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Send In-App Message">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setShowCreditModal(true)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Gift Credit">
                                            <Gift className="w-4 h-4" />
                                        </button>
                                        <button onClick={impersonateUser} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Login As User">
                                            <LogIn className="w-4 h-4" />
                                        </button>
                                        <button onClick={exportUserData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Export Data">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={blockUser} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${user.status === 'blocked' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                            {user.status === 'blocked' ? <><Shield className="w-4 h-4" /> Unblock</> : <><Ban className="w-4 h-4" /> Block</>}
                                        </button>
                                    </div>

                                    {/* Mini Stats Grid */}
                                    <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">₹{(stats.totalSpent || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Spent</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">{stats.orderCount || 0}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Orders</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">{reviews.length || 0}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Reviews</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-lg font-bold text-gray-900">₹{clv}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">CLV/Yr</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Favorite Categories */}
            {favoriteCategories.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Favorite Categories</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {favoriteCategories.map((cat, i) => (
                            <span key={i} className={`px-3 py-1.5 rounded-full text-sm ${i === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {cat.name} ({cat.count})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs - Minimalist */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-none md:flex-1 px-6 py-3.5 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab === 'orders' && <ShoppingBag className="w-4 h-4 inline mr-2" />}
                            {tab === 'addresses' && <MapPin className="w-4 h-4 inline mr-2" />}
                            {tab === 'reviews' && <Star className="w-4 h-4 inline mr-2" />}
                            {tab === 'wishlist' && <Heart className="w-4 h-4 inline mr-2" />}
                            {tab === 'activity' && <Activity className="w-4 h-4 inline mr-2" />}
                            {tab === 'notes' && <MessageSquare className="w-4 h-4 inline mr-2" />}
                            {tab === 'status history' && <Shield className="w-4 h-4 inline mr-2" />}
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Orders Tab */}
                    {activeTab === 'orders' && <OrdersTab orders={orders} />}

                    {/* Addresses Tab */}
                    {activeTab === 'addresses' && <AddressesTab addresses={addresses} />}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && <ReviewsTab reviews={reviews} />}

                    {/* Wishlist Tab */}
                    {activeTab === 'wishlist' && <WishlistTab wishlist={wishlist} />}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && <ActivityTab activityLog={activityLog} />}

                    {/* Verification History Tab */}
                    {activeTab === 'verification history' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Verification History</h3>
                                <button onClick={() => apiClient.get(`/api/admin/users/${id}/activity`).then(res => setActivityLog(res.data || [])).catch(console.error)} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                    <Activity className="w-4 h-4" /> Refresh Log
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activityLog.filter(log => log.admin_action?.action_type?.startsWith('VERIFICATION_')).length > 0 ? (
                                            activityLog
                                                .filter(log => log.admin_action?.action_type?.startsWith('VERIFICATION_'))
                                                .map((log, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${log.admin_action.action_type === 'VERIFICATION_APPROVED' ? 'bg-green-100 text-green-800' :
                                                                    log.admin_action.action_type === 'VERIFICATION_REVOKED' ? 'bg-red-100 text-red-800' :
                                                                        log.admin_action.action_type === 'VERIFICATION_RETRACTED' ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-gray-100 text-gray-800'}`}>
                                                                {log.admin_action.action_type.replace('VERIFICATION_', '')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {log.admin_context?.admin_name || 'System'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.admin_action?.audit_notes || log.admin_action?.reason}>
                                                            {log.admin_action?.audit_notes || log.admin_action?.reason || '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    No verification history found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'notes' && (
                        <NotesTab
                            notes={notes}
                            newNote={newNote}
                            setNewNote={setNewNote}
                            addNote={addNote}
                        />
                    )}

                    {/* Status History Tab */}
                    {activeTab === 'status history' && (
                        <StatusHistoryTab statusHistory={user.statusHistory} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDetails;
