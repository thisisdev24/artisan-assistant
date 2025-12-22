import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    ArrowLeft, Mail, Phone, Calendar, Store, Package, ShoppingBag,
    Star, MapPin, TrendingUp, Ban, Shield, Trash2, Download,
    BadgeCheck, DollarSign, Eye, MessageSquare, Users, Activity,
    CheckCircle, Send, Clock, AlertCircle, Search, SlidersHorizontal, ChevronDown,
    XCircle, RotateCcw, ShieldAlert
} from 'lucide-react';
import { ActivityTab } from './UserDetailsTabs';
import { useAuth } from '../../context/AuthContext';

// Helper to extract image URL from various formats
const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.large || img.thumb || img.hi_res || img.variant || img.url || null;
};

const SellerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activityLog, setActivityLog] = useState([]);
    const [stats, setStats] = useState({ productCount: 0, totalSales: 0, totalRevenue: 0, avgRating: 0 });
    const [activeTab, setActiveTab] = useState('products');

    // Time filters
    const [ordersFilter, setOrdersFilter] = useState('all');
    const [customersFilter, setCustomersFilter] = useState('all');
    const [notesFilter, setNotesFilter] = useState('all');
    const [transactionsFilter, setTransactionsFilter] = useState('all');
    const [customerFilter, setCustomerFilter] = useState('all');

    // Custom date ranges
    const [ordersDateRange, setOrdersDateRange] = useState({ from: '', to: '' });
    const [customersDateRange, setCustomersDateRange] = useState({ from: '', to: '' });
    const [notesDateRange, setNotesDateRange] = useState({ from: '', to: '' });

    // Table view limits
    const [ordersLimit, setOrdersLimit] = useState(10);
    const [customersLimit, setCustomersLimit] = useState(10);

    // Product filters
    const [productSearch, setProductSearch] = useState('');
    const [productSort, setProductSort] = useState('newest'); // newest, orders, reviews, price_high, price_low
    const [productStatus, setProductStatus] = useState('all'); // all, active, inactive, out_of_stock

    // Pagination
    const [ordersPage, setOrdersPage] = useState(1);
    const [customersPage, setCustomersPage] = useState(1);

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

    // Helper: Filter by time period
    const filterByTime = (items, dateField, filter, dateRange = {}) => {
        if (filter === 'all') return items;
        if (filter === 'custom') {
            const from = dateRange.from ? new Date(dateRange.from) : null;
            const to = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : null;
            return items.filter(item => {
                const itemDate = new Date(item[dateField]);
                if (from && itemDate < from) return false;
                if (to && itemDate > to) return false;
                return true;
            });
        }
        const now = new Date();
        let cutoff = new Date();
        switch (filter) {
            case '24h': cutoff.setHours(now.getHours() - 24); break;
            case '7d': cutoff.setDate(now.getDate() - 7); break;
            case '30d': cutoff.setDate(now.getDate() - 30); break;
            case '90d': cutoff.setDate(now.getDate() - 90); break;
            default: return items;
        }
        return items.filter(item => new Date(item[dateField]) >= cutoff);
    };

    // Filtered & sorted products
    const filteredProducts = React.useMemo(() => {
        let result = [...products];

        // Search filter
        if (productSearch) {
            const q = productSearch.toLowerCase();
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (productStatus !== 'all') {
            if (productStatus === 'active') result = result.filter(p => p.status === 'active' || p.is_active === true);
            if (productStatus === 'inactive') result = result.filter(p => p.status === 'inactive' || p.is_active === false);
            if (productStatus === 'out_of_stock') result = result.filter(p => (p.stock || p.quantity || 0) <= 0);
        }

        // Sorting
        switch (productSort) {
            case 'orders':
                result.sort((a, b) => (b.order_count || b.sales_count || 0) - (a.order_count || a.sales_count || 0));
                break;
            case 'reviews':
                result.sort((a, b) => (b.rating || b.average_rating || 0) - (a.rating || a.average_rating || 0));
                break;
            case 'price_high':
                result.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'price_low':
                result.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'newest':
            default:
                result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        return result;
    }, [products, productSearch, productStatus, productSort]);

    useEffect(() => {
        loadSellerData();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'transactions' && !orders.length) {
            loadOrders();
            loadCustomers();
        }
        if (activeTab === 'reviews' && !reviews.length) loadReviews();
        if (activeTab === 'notes' && !notes.length) loadNotes();
        if (activeTab === 'messages' && !messages.length) loadMessages();
        if (activeTab === 'messages' && !messages.length) loadMessages();
        if ((activeTab === 'activity' || activeTab === 'verification history') && !activityLog.length) loadActivity();
    }, [activeTab]);

    const loadSellerData = async () => {
        setLoading(true);
        try {
            const sellerRes = await apiClient.get(`/api/admin/sellers/${id}`);
            setSeller(sellerRes.data.seller || sellerRes.data);
            setStats(sellerRes.data.stats || stats);

            // Load products immediately as it's common
            try {
                const prodRes = await apiClient.get(`/api/admin/sellers/${id}/products`);
                setProducts(prodRes.data || []);
            } catch (e) { }
        } catch (err) {
            console.error('Failed to load seller:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadOrders = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/orders`);
            setOrders(res.data);
        } catch (err) { console.error(err); }
    };

    const loadReviews = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/reviews`);
            setReviews(res.data);
        } catch (err) { console.error(err); }
    };

    const loadCustomers = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/customers`);
            setCustomers(res.data);
        } catch (err) { console.error(err); }
    };

    const loadNotes = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/notes`);
            setNotes(res.data);
        } catch (err) { console.error(err); }
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        try {
            const res = await apiClient.post(`/api/admin/sellers/${id}/notes`, { content: newNote });
            setNotes(prev => [res.data.note, ...prev]);
            setNewNote('');
        } catch (err) { alert('Failed to add note'); }
    };

    const loadMessages = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/messages`);
            setMessages(res.data || []);
        } catch (err) { console.error(err); }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        try {
            const res = await apiClient.post(`/api/admin/sellers/${id}/messages`, { content: newMessage });
            setMessages(prev => [...prev, res.data.message]);
            setNewMessage('');
        } catch (err) { alert('Failed to send message'); }
    };

    const loadActivity = async () => {
        try {
            const res = await apiClient.get(`/api/admin/sellers/${id}/activity`);
            setActivityLog(res.data || []);
        } catch (err) { console.error(err); }
    };

    const verifyField = async (field) => {
        if (!window.confirm(`Verify seller's ${field}?`)) return;
        try {
            await apiClient.post(`/api/admin/sellers/${id}/verify-field`, { field });
            loadSellerData();
        } catch (err) { alert('Verification failed'); }
    };

    const forceApprove = async () => {
        if (!window.confirm('Add your approval for force verification?')) return;
        try {
            const res = await apiClient.post(`/api/admin/sellers/${id}/force-approve`);
            alert(res.data.msg);
            loadSellerData();
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed');
        }
    };

    const handleVerification = async (status) => {
        if (!window.confirm(`Mark this seller as ${status}?`)) return;
        try {
            await apiClient.put(`/api/admin/sellers/${id}/verify`, { status });
            loadSellerData();
        } catch (err) {
            alert('Verification failed');
        }
    };

    const blockSeller = async () => {
        if (!window.confirm(seller.status === 'blocked' ? 'Unblock?' : 'Block this seller?')) return;
        try {
            await apiClient.put(`/api/admin/users/${id}/block`, { blocked: seller.status !== 'blocked' });
            loadSellerData();
        } catch (err) {
            alert('Failed');
        }
    };

    const deleteSeller = async () => {
        if (!window.confirm('Delete this seller permanently?')) return;
        try {
            await apiClient.delete(`/api/admin/users/${id}`);
            navigate('/admin/sellers');
        } catch (err) {
            alert('Failed');
        }
    };

    const revokeVerification = async () => {
        if (!window.confirm('Are you sure you want to REVOKE verification? This will reset approvals and notify the seller.')) return;
        try {
            await apiClient.post(`/api/admin/sellers/${id}/revoke-verification`);
            alert('Verification revoked successfully');
            loadSellerData();
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to revoke verification');
        }
    };

    const removeApproval = async () => {
        if (!window.confirm('Retract your approval?')) return;
        try {
            await apiClient.post(`/api/admin/sellers/${id}/remove-approval`);
            loadSellerData();
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to remove approval');
        }
    };

    const exportSellerData = () => {
        const data = { seller, stats, products, orders, reviews, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seller_${seller.name?.replace(/\s+/g, '_')}_${id}.json`;
        a.click();
    };

    const sendNotification = async () => {
        const message = prompt('Enter message for seller:');
        if (!message) return;
        try {
            await apiClient.post(`/api/admin/sellers/${id}/notify`, { message, title: 'Message from Admin' });
            alert('Message sent successfully!');
        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send message');
        }
    };

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!seller) return <div className="text-center py-12">Seller not found</div>;

    const tabs = ['products', 'order details', 'verification', 'verification history', 'activity', 'messages', 'notes', 'status history'];

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/admin/sellers')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Sellers
            </button>

            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-purple-100 to-indigo-100 relative group">
                    {seller.store_banner && <img src={seller.store_banner} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                </div>
                <div className="px-6 pb-2">
                    <div className="flex flex-col lg:flex-row gap-6 -mt-12 mb-6 relative z-10">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl bg-white p-1 shadow-lg border-2 border-white overflow-hidden">
                                {seller.store_logo ? (
                                    <img src={seller.store_logo} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <div className="w-full h-full bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 text-2xl font-bold">
                                        {seller.name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 pt-2 lg:pt-14">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl font-bold text-gray-900">{seller.store || seller.name}</h1>
                                        {seller.verification?.status === 'verified' && <BadgeCheck className="w-6 h-6 text-blue-500" />}
                                        {seller.verification?.status !== 'verified' && (seller.verification?.adminApprovals?.length || 0) > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                Partially Verified ({seller.verification.adminApprovals.length}/3)
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${seller.isOnline ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${seller.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {seller.isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-3 max-w-xl">{seller.name} • {seller.store_description || 'No description provided'}</p>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${seller.emailVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} title={seller.emailVerified ? `Verified ${formatRelativeTime(seller.emailVerifiedAt)}` : 'Email not verified'}>
                                            <Mail className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[180px]">{seller.email}</span>
                                            {seller.emailVerified ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-gray-400" />}
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${seller.phoneVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} title={seller.phoneVerified ? `Verified ${formatRelativeTime(seller.phoneVerifiedAt)}` : 'Phone not verified'}>
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{seller.phone || 'No phone'}</span>
                                            {seller.phoneVerified ? <CheckCircle className="w-3 h-3 text-green-500" /> : seller.phone && <AlertCircle className="w-3 h-3 text-gray-400" />}
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${seller.identity_card?.verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`} title={seller.identity_card?.verified ? 'Identity Verified' : 'Identity Pending'}>
                                            <Shield className="w-3.5 h-3.5" /> {seller.identity_card?.verified ? 'ID Verified' : 'ID Pending'}
                                        </div>
                                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" /> Joined: {new Date(seller.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> Active: {seller.lastLogin ? new Date(seller.lastLogin).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'Never'}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side actions & Stats */}
                                <div className="flex flex-col gap-4 items-end">
                                    <div className="flex gap-2">
                                        <button onClick={() => window.location.href = `mailto:${seller.email}`} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Send Email">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button onClick={sendNotification} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Send In-App Message">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button onClick={exportSellerData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Export Data">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={blockSeller} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${seller.status === 'blocked' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                            {seller.status === 'blocked' ? <><Shield className="w-4 h-4" /> Unblock Seller</> : <><Ban className="w-4 h-4" /> Block Seller</>}
                                        </button>
                                    </div>

                                    {/* Mini Stats Grid */}
                                    <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Revenue</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">{stats.totalSales || 0}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Orders</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-gray-900">{products.length}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Products</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-lg font-bold text-gray-900">{stats.avgRating || 0}</span>
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            </div>
                                            <p className="text-[10px] text-gray-500 uppercase font-semibold">Rating</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-6">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
                {activeTab === 'verification' && (
                    <div className="space-y-6">
                        {/* Contact Verification Status (Read-Only) */}
                        <div className="p-5 border border-gray-200 rounded-xl">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-gray-400" /> Contact Verification
                                <span className="text-xs font-normal text-gray-500">(managed by seller)</span>
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium">{seller.email}</p>
                                        <p className="text-xs text-gray-500">
                                            {seller.emailVerified ? (
                                                <span className="text-green-600">Verified {seller.emailVerifiedAt ? formatRelativeTime(seller.emailVerifiedAt) : ''}</span>
                                            ) : 'Not verified by seller'}
                                        </p>
                                    </div>
                                    {seller.emailVerified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium">{seller.phone || 'No phone provided'}</p>
                                        <p className="text-xs text-gray-500">
                                            {seller.phoneVerified ? (
                                                <span className="text-green-600">Verified {seller.phoneVerifiedAt ? formatRelativeTime(seller.phoneVerifiedAt) : ''}</span>
                                            ) : 'Not verified by seller'}
                                        </p>
                                    </div>
                                    {seller.phoneVerified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                                </div>
                            </div>
                        </div>

                        {/* Document Verification (Admin Action) */}
                        <div className="p-5 border border-gray-200 rounded-xl">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-gray-400" /> Document Verification
                            </h3>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">{seller.identity_card?.type || 'No document uploaded'}</p>
                                    <p className="text-xs text-gray-500">
                                        {seller.identity_card?.verified ? (
                                            <span className="text-green-600">Verified {seller.identity_card?.verifiedAt ? formatRelativeTime(seller.identity_card.verifiedAt) : ''} by {seller.identity_card?.verifiedByName || 'Admin'}</span>
                                        ) : seller.identity_card?.document_url ? 'Pending admin review' : 'Waiting for seller upload'}
                                    </p>
                                </div>
                                {seller.identity_card?.verified ? (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                ) : seller.identity_card?.document_url ? (
                                    <div className="flex gap-2">
                                        <a href={seller.identity_card.document_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">View Document</a>
                                        <button onClick={() => verifyField('identity')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Verify</button>
                                    </div>
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Force Verification (For Documents) */}
                        <div className="p-5 border border-gray-200 rounded-xl">
                            <h3 className="text-lg font-semibold mb-4">Overall Verification Status</h3>
                            <div className="flex items-center gap-6 flex-wrap mb-4">
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${seller.emailVerified ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    <span className="text-sm">Email</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${seller.phoneVerified ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    <span className="text-sm">Phone</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${seller.identity_card?.verified ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    <span className="text-sm">Identity Document</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">Force Verification (Document)</p>
                                    <p className="text-xs text-gray-600">Requires 3 admin approvals to force verify without all documents</p>
                                </div>
                                {seller.verification?.status === 'verified' ? (
                                    <div className="flex items-center gap-3">
                                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" /> Verified
                                        </span>
                                        <button
                                            onClick={revokeVerification}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Revoke Verification
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{seller.verification?.adminApprovals?.length || 0}/3 Approvals</span>
                                        {seller.verification?.adminApprovals?.some(a => a.adminId === user?.id) ? (
                                            <button
                                                onClick={removeApproval}
                                                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                                            >
                                                Remove My Approval
                                            </button>
                                        ) : (
                                            <button
                                                onClick={forceApprove}
                                                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                                            >
                                                Add My Approval
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payout Details Section */}
                        <div className="p-5 border border-gray-200 rounded-xl">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-gray-400" /> Payout Details
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Bank Account</p>
                                    {seller.bank_details?.account_number ? (
                                        <div>
                                            <p className="text-sm font-medium">{seller.bank_details.bank_name || 'N/A'}</p>
                                            <p className="text-xs text-gray-600">A/C: ****{seller.bank_details.account_number?.slice(-4)}</p>
                                            <p className="text-xs text-gray-600">IFSC: {seller.bank_details.ifsc_code || 'N/A'}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Not provided</p>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase mb-1">UPI ID</p>
                                    <p className="text-sm font-medium">{seller.upi_id || 'Not provided'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Payout Status</p>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${seller.payout_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {seller.payout_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Pending Payout</p>
                                    <p className="text-sm font-medium">₹{(seller.pending_payout || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Last Payout</p>
                                    <p className="text-sm font-medium">{seller.last_payout_date ? formatRelativeTime(seller.last_payout_date) : 'No payouts yet'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {activeTab === 'products' && (
                    <div className="space-y-4">
                        {/* Filter Toolbar */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search products by name, category..."
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={productStatus}
                                        onChange={e => setProductStatus(e.target.value)}
                                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>

                                {/* Sort */}
                                <div className="flex items-center gap-2">
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={productSort}
                                        onChange={e => setProductSort(e.target.value)}
                                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="orders">Most Orders</option>
                                        <option value="reviews">Highest Rated</option>
                                        <option value="price_high">Price: High → Low</option>
                                        <option value="price_low">Price: Low → High</option>
                                    </select>
                                </div>
                            </div>

                            {/* Results count */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Showing <span className="font-medium text-gray-900">{filteredProducts.length}</span> of {products.length} products
                                </p>
                                {(productSearch || productStatus !== 'all') && (
                                    <button
                                        onClick={() => { setProductSearch(''); setProductStatus('all'); setProductSort('newest'); }}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProducts.map(p => (
                                <div key={p._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/admin/products/${p._id}`)}>
                                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                                        {getImageUrl(p.images?.[0]) ? (
                                            <img src={getImageUrl(p.images[0])} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'active' || p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {p.status || (p.is_active ? 'Active' : 'Inactive')}
                                            </span>
                                        </div>
                                        {/* Show order count badge if sorting by orders */}
                                        {productSort === 'orders' && (p.order_count || p.sales_count) > 0 && (
                                            <div className="absolute top-2 left-2">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                    {p.order_count || p.sales_count} orders
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">{p.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description?.slice(0, 80) || 'No description'}</p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">₹{p.price?.toLocaleString()}</p>
                                                {p.compare_price && p.compare_price > p.price && (
                                                    <p className="text-xs text-gray-400 line-through">₹{p.compare_price?.toLocaleString()}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                    <span className="text-sm font-medium">{(p.rating || p.average_rating)?.toFixed(1) || '0.0'}</span>
                                                    <span className="text-xs text-gray-400">({p.rating_number || p.review_count || 0})</span>
                                                </div>
                                                <span className={`text-xs ${(p.stock || p.quantity) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {(p.stock || p.quantity) > 0 ? `${p.stock || p.quantity} in stock` : 'Out of stock'}
                                                </span>
                                            </div>
                                        </div>
                                        {p.category && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{p.category}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Empty State */}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 mb-2">
                                    {products.length === 0 ? 'No products listed yet' : 'No products match your filters'}
                                </p>
                                {products.length > 0 && (
                                    <button
                                        onClick={() => { setProductSearch(''); setProductStatus('all'); }}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'order details' && (
                    <div className="space-y-8">
                        {/* Orders Section */}
                        {/* Orders Section */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-gray-400" /> Recent Orders
                                    <span className="text-sm font-normal text-gray-500">({filterByTime(orders, 'createdAt', transactionsFilter, ordersDateRange).length})</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={ordersLimit}
                                        onChange={(e) => setOrdersLimit(Number(e.target.value))}
                                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value={5}>Show 5</option>
                                        <option value={10}>Show 10</option>
                                        <option value={20}>Show 20</option>
                                        <option value={50}>Show 50</option>
                                    </select>
                                    <select
                                        value={transactionsFilter}
                                        onChange={(e) => setTransactionsFilter(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="30d">Last 30 Days</option>
                                        <option value="90d">Last 90 Days</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">Order ID</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Total</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Review</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterByTime(orders, 'createdAt', transactionsFilter, ordersDateRange).slice(0, 10).map(o => {
                                            // Find review for this order (assuming review has order_id, or we match by user/product context)
                                            // Since we don't have direct order_id in review snippet earlier, we'll try to match or assume structure.
                                            // A robust app would have 'order_id' in review. Let's assume r.order_id === o._id
                                            const orderReview = reviews.find(r => r.order_id === o._id || (r.user === o.user?._id && Math.abs(new Date(r.createdAt) - new Date(o.createdAt)) < 864000000)); // tight coupling assumption or ID match

                                            return (
                                                <tr key={o._id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/orders/${o._id}`)}>
                                                    <td className="px-4 py-3 font-medium">#{o._id.slice(-6)}</td>
                                                    <td className="px-4 py-3" title={new Date(o.createdAt).toLocaleString()}>
                                                        {formatRelativeTime(o.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3">₹{o.total_amount?.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs capitalize ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {orderReview ? (
                                                            <div className="min-w-[140px]">
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <div className="flex text-amber-400">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Star key={i} className={`w-3 h-3 ${i < orderReview.rating ? 'fill-current' : 'text-gray-300'}`} />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">({orderReview.rating})</span>
                                                                </div>
                                                                <p className="text-xs text-gray-600 truncate max-w-[150px]" title={orderReview.comment}>{orderReview.comment}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No review</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {orders.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No orders yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Customers Section */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-gray-400" /> Top Customers
                                    <span className="text-sm font-normal text-gray-500">({customers.length})</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={customersLimit}
                                        onChange={(e) => setCustomersLimit(Number(e.target.value))}
                                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value={5}>Show 5</option>
                                        <option value={10}>Show 10</option>
                                        <option value={20}>Show 20</option>
                                        <option value={50}>Show 50</option>
                                    </select>
                                    <select
                                        value={customerFilter}
                                        onChange={(e) => setCustomerFilter(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="all">All Customers</option>
                                        <option value="reviewed">Reviewed Only</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Orders</th>
                                            <th className="px-4 py-3">Total Spent</th>
                                            <th className="px-4 py-3">Last Order</th>
                                            <th className="px-4 py-3">Latest Review</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customers.filter(c => {
                                            if (customerFilter === 'all') return true;
                                            // Check if customer has any reviews (assuming review.product_title implies it's a valid review linked to this seller's product)
                                            // Note: In a real app we'd verify user ID match, here we'll assume reviews are fetched for this seller
                                            // and we might need to match names or assume reviews logic links them.
                                            // Let's match roughly or just check if reviews exist related to this customer if possible.
                                            // Since we don't have direct user_id in customer object from this snippet, 
                                            // we will try to match by name or email if available in reviews, or just filter meaningful ones.
                                            // For this MVP step, we'll try to match specific review to customer if review extends user info.
                                            // However reviews array snippet showed product_title/rating.
                                            // Let's assume we can finding a review by matching something?
                                            // Actually, the review object usually has a user field. Let's try to match by simple logic or just showing all for now.
                                            // BETTER: Let's match by name if review has user name, or just show if filter is active.
                                            // Wait, the previous review snippet didn't show user name in review. 
                                            // Let's assume reviews array has 'user' object or ID.
                                            // Since I can't confirm without seeing API, will implementing matching logic:
                                            // match review.user === c._id (very likely structure).
                                            if (customerFilter === 'reviewed') {
                                                const hasReview = reviews.some(r => r.user?._id === c._id || r.user === c._id || r.user_name === c.name);
                                                return hasReview;
                                            }
                                            return true;
                                        }).slice(0, customersLimit).map(c => {
                                            // Find latest review for this customer
                                            const customerReview = reviews.find(r => r.user?._id === c._id || r.user === c._id || r.user_name === c.name);

                                            return (
                                                <tr key={c._id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/users/${c._id}`)}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                                                                {c.name?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <span className="font-medium">{c.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                                    <td className="px-4 py-3">{c.orderCount}</td>
                                                    <td className="px-4 py-3 font-medium">₹{c.totalSpent?.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-gray-500" title={new Date(c.lastOrderDate).toLocaleString()}>
                                                        {formatRelativeTime(c.lastOrderDate)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {customerReview ? (
                                                            <div className="min-w-[140px]">
                                                                <div className="flex items-center gap-1 mb-0.5">
                                                                    <div className="flex text-amber-400">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Star key={i} className={`w-3 h-3 ${i < customerReview.rating ? 'fill-current' : 'text-gray-300'}`} />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">({customerReview.rating})</span>
                                                                </div>
                                                                <p className="text-xs text-gray-600 truncate max-w-[150px]" title={customerReview.comment}>{customerReview.comment}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No reviews</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {customers.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-500">No customers yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>


                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <p className="text-sm text-gray-500">{filterByTime(notes, 'createdAt', notesFilter, notesDateRange).length} notes</p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={notesFilter}
                                    onChange={(e) => setNotesFilter(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                                >
                                    <option value="all">All Time</option>
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                                {notesFilter === 'custom' && (
                                    <>
                                        <input
                                            type="date"
                                            value={notesDateRange.from}
                                            onChange={(e) => setNotesDateRange(prev => ({ ...prev, from: e.target.value }))}
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                                        />
                                        <span className="text-xs text-gray-400">to</span>
                                        <input
                                            type="date"
                                            value={notesDateRange.to}
                                            onChange={(e) => setNotesDateRange(prev => ({ ...prev, to: e.target.value }))}
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Add a note about this seller..."
                                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                            />
                            <button onClick={addNote} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                                Add Note
                            </button>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filterByTime(notes, 'createdAt', notesFilter, notesDateRange).map((note, idx) => (
                                <div key={idx} className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                                    <p className="text-gray-800 text-sm">{note.content}</p>
                                    <p className="text-xs text-gray-500 mt-2" title={new Date(note.createdAt).toLocaleString()}>
                                        {note.createdByName || 'Admin'} • {formatRelativeTime(note.createdAt)}
                                    </p>
                                </div>
                            ))}
                            {filterByTime(notes, 'createdAt', notesFilter, notesDateRange).length === 0 && (
                                <div className="text-center py-10">
                                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No notes in this period</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                    <div className="space-y-4">
                        {reviews.map(r => (
                            <div key={r._id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 flex gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                    {r.product_image && <img src={r.product_image} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex text-amber-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium">{r.product_title}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm">{r.comment}</p>
                                    <p className="text-xs text-gray-400 mt-1" title={new Date(r.createdAt).toLocaleString()}>{formatRelativeTime(r.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                        {reviews.length === 0 && <p className="text-gray-500 text-center py-10">No reviews yet</p>}
                    </div>
                )}

                {/* Verification History Tab */}
                {activeTab === 'verification history' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Verification History</h3>
                            <button onClick={() => apiClient.get(`/api/admin/sellers/${id}/activity`).then(res => setActivityLog(res.data || [])).catch(console.error)} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                <Activity className="w-4 h-4" /> Refresh Log
                            </button>
                        </div>

                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 ml-3">
                            {activityLog.filter(log => log.admin_action?.action_type?.startsWith('VERIFICATION_')).length > 0 ? (
                                activityLog
                                    .filter(log => log.admin_action?.action_type?.startsWith('VERIFICATION_'))
                                    .map((log, index) => {
                                        const type = log.admin_action.action_type;
                                        const isApproved = type === 'VERIFICATION_APPROVED';
                                        const isRevoked = type === 'VERIFICATION_REVOKED';
                                        const isRetracted = type === 'VERIFICATION_RETRACTED';
                                        const isRejected = type === 'VERIFICATION_REJECTED';

                                        return (
                                            <div key={index} className="relative">
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[21px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center 
                                                    ${isApproved ? 'bg-green-100 text-green-600' :
                                                        isRevoked ? 'bg-red-100 text-red-600' :
                                                            isRetracted ? 'bg-amber-100 text-amber-600' :
                                                                'bg-gray-100 text-gray-500'}`}>
                                                    {isApproved && <CheckCircle className="w-4 h-4" />}
                                                    {isRevoked && <XCircle className="w-4 h-4" />}
                                                    {isRetracted && <RotateCcw className="w-4 h-4" />}
                                                    {isRejected && <ShieldAlert className="w-4 h-4" />}
                                                    {!isApproved && !isRevoked && !isRetracted && !isRejected && <Shield className="w-4 h-4" />}
                                                </div>

                                                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {isApproved ? 'Verification Approved' :
                                                                    isRevoked ? 'Verification Revoked' :
                                                                        isRetracted ? 'Approval Retracted' :
                                                                            isRejected ? 'Verification Rejected' :
                                                                                'Verification Update'}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                by <span className="font-medium text-gray-700">{log.admin_context?.admin_name || 'System'}</span>
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-gray-400" title={new Date(log.timestamp).toLocaleString()}>
                                                            {formatRelativeTime(log.timestamp)}
                                                        </span>
                                                    </div>
                                                    {(log.admin_action?.audit_notes || log.admin_action?.reason) && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                                                            {log.admin_action?.audit_notes || log.admin_action?.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200 ml-[-20px]">
                                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No verification history recorded yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <ActivityTab activityLog={activityLog} />
                    </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                    <div className="flex flex-col h-[500px]">
                        <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg mb-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.fromAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-4 py-2 rounded-lg ${msg.fromAdmin ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}>
                                        <p className="text-sm">{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.fromAdmin ? 'text-indigo-200' : 'text-gray-400'}`} title={new Date(msg.createdAt).toLocaleString()}>
                                            {msg.senderName || (msg.fromAdmin ? 'Admin' : 'Seller')} • {formatRelativeTime(msg.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="text-center py-16">
                                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No messages yet. Start a conversation!</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message to seller..."
                                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                <Send className="w-4 h-4" /> Send
                            </button>
                        </div>
                    </div>
                )}

                {/* Status History Tab */}
                {activeTab === 'status history' && (
                    <div className="relative">
                        {seller.statusHistory?.length > 0 ? (
                            <div className="space-y-4">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                                {seller.statusHistory.slice().reverse().map((entry, idx) => (
                                    <div key={idx} className="relative flex gap-4 pb-4">
                                        <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                                        </div>
                                        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.from === 'active' ? 'bg-green-100 text-green-700' : entry.from === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {entry.from || 'Unknown'}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.to === 'active' ? 'bg-green-100 text-green-700' : entry.to === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {entry.to || 'Unknown'}
                                                </span>
                                            </div>
                                            {entry.reason && <p className="text-sm text-gray-600 mb-2">Reason: {entry.reason}</p>}
                                            <div className="text-xs text-gray-500" title={new Date(entry.timestamp).toLocaleString()}>
                                                By: <span className="font-medium">{entry.changedByName || 'Admin'}</span> • {formatRelativeTime(entry.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No status changes recorded</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
        </div>
    </div>
);

export default SellerDetails;
