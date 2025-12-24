import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/apiClient';
import {
    Users, Store, Package, TrendingUp, TrendingDown, Search, Download, X,
    ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Mail, ShoppingBag,
    Trash2, Ban, Shield, BadgeCheck, RotateCcw, Settings,
    Columns, Keyboard, Activity, Sparkles
} from 'lucide-react';

const Admin = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [userStats, setUserStats] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [quickStats, setQuickStats] = useState({ total: 0, activeToday: 0, blocked: 0, newUsers: 0 });
    const [denseView, setDenseView] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(['user', 'email', 'status', 'joined', 'actions']);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [undoAction, setUndoAction] = useState(null);
    const [hoveredUser, setHoveredUser] = useState(null);

    useEffect(() => {
        if (tabFromUrl) setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    useEffect(() => {
        loadData();
    }, [activeTab, pagination.page, searchQuery, statusFilter, sortBy, sortOrder]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (activeTab !== 'users') return;
            if (e.target.tagName === 'INPUT') return;

            if (e.key === 'b' && selectedUsers.length > 0) {
                e.preventDefault();
                bulkAction('block');
            } else if (e.key === 'd' && selectedUsers.length > 0) {
                e.preventDefault();
                bulkAction('delete');
            } else if (e.key === 'Escape') {
                setSelectedUsers([]);
                setSelectAll(false);
            } else if (e.key === 'a' && e.ctrlKey) {
                e.preventDefault();
                toggleSelectAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, selectedUsers]);

    useEffect(() => {
        if (undoAction) {
            const timer = setTimeout(() => setUndoAction(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [undoAction]);

    const loadData = async () => {
        setLoading(true);
        setSelectedUsers([]);
        setSelectAll(false);
        try {
            if (activeTab === 'dashboard') {
                const res = await apiClient.get('/api/admin/stats');
                setStats(res.data);
            } else if (activeTab === 'users') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: pagination.limit,
                    ...(searchQuery && { search: searchQuery }),
                    ...(statusFilter !== 'all' && { status: statusFilter }),
                });
                const res = await apiClient.get(`/api/admin/users?${params}`);
                let userData = res.data.users || res.data || [];

                userData = [...userData].sort((a, b) => {
                    let aVal = a[sortBy] || '';
                    let bVal = b[sortBy] || '';
                    if (sortBy === 'createdAt') {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                    }
                    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
                    return aVal < bVal ? 1 : -1;
                });
                setUsers(userData);

                if (res.data.pagination) {
                    setPagination(prev => ({ ...prev, ...res.data.pagination }));
                }

                const allUsers = res.data.users || res.data || [];
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

                setQuickStats({
                    total: res.data.pagination?.total || allUsers.length,
                    activeToday: allUsers.filter(u => u.lastLogin && new Date(u.lastLogin) >= today).length,
                    blocked: allUsers.filter(u => u.status === 'blocked').length,
                    newUsers: allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length
                });
            } else if (activeTab === 'sellers') {
                const res = await apiClient.get('/api/admin/sellers');
                setSellers(res.data || []);
            } else if (activeTab === 'products') {
                const res = await apiClient.get('/api/admin/listings');
                setListings(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const toggleSelectUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(u => u._id));
        }
        setSelectAll(!selectAll);
    };

    const bulkAction = async (action) => {
        if (selectedUsers.length === 0) return;
        if (!window.confirm(`${action} ${selectedUsers.length} users?`)) return;

        const affectedUsers = users.filter(u => selectedUsers.includes(u._id));

        try {
            for (const userId of selectedUsers) {
                if (action === 'block') {
                    await apiClient.put(`/api/admin/users/${userId}/block`, { blocked: true });
                } else if (action === 'unblock') {
                    await apiClient.put(`/api/admin/users/${userId}/block`, { blocked: false });
                } else if (action === 'delete') {
                    await apiClient.delete(`/api/admin/users/${userId}`);
                }
            }

            setUndoAction({ action, users: affectedUsers, count: selectedUsers.length });
            loadData();
        } catch (err) {
            alert('Some actions failed', err.response?.data?.msg);
        }
    };

    const loadUserStats = async (userId) => {
        try {
            const res = await apiClient.get(`/api/admin/users/${userId}/stats`);
            setUserStats(res.data);
            setShowModal(true);
        } catch (err) {
            console.error('Failed to load user stats:', err.response?.data?.msg);
        }
    };

    const blockUser = async (userId, blocked) => {
        const targetUser = users.find(u => u._id === userId);
        try {
            await apiClient.put(`/api/admin/users/${userId}/block`, { blocked });
            setUndoAction({
                action: blocked ? 'blocked' : 'unblocked',
                users: [targetUser],
                userId,
                previousState: !blocked
            });
            loadData();
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed');
        }
    };

    const undoLastAction = async () => {
        if (!undoAction) return;
        try {
            if (undoAction.action === 'blocked' || undoAction.action === 'unblocked') {
                await apiClient.put(`/api/admin/users/${undoAction.userId}/block`, { blocked: undoAction.previousState });
            }
            setUndoAction(null);
            loadData();
        } catch (err) {
            alert('Undo failed', err.response?.data?.msg);
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await apiClient.delete(`/api/admin/users/${userId}`);
            setUndoAction({ action: 'deleted', count: 1 });
            loadData();
        } catch (err) {
            alert('Failed to delete', err.response?.data?.msg);
        }
    };

    const exportUsers = async () => {
        try {
            const res = await apiClient.get('/api/admin/users/export');
            const csv = [
                ['Name', 'Email', 'Status', 'Online', 'Last Login', 'Created At'].join(','),
                ...res.data.map(u => [u.name, u.email, u.status, u.isOnline, u.lastLogin, u.createdAt].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'users.csv';
            a.click();
        } catch (err) {
            alert('Export failed', err.response?.data?.msg);
        }
    };

    const deleteListing = async (id) => {
        if (!window.confirm('Delete this listing?')) return;
        try {
            await apiClient.delete(`/api/admin/${id}/approve-delete`);
            loadData();
        } catch (err) {
            alert('Failed', err.response?.data?.msg);
        }
    };

    const rejectDeletion = async (id) => {
        if (!window.confirm('Reject deletion?')) return;
        try {
            await apiClient.patch(`/api/admin/${id}/reject-delete`);
            loadData();
        } catch (err) {
            alert('Failed', err.response?.data?.msg);
        }
    };

    const getStatusColor = (status, isOnline) => {
        if (status === 'blocked') return 'bg-red-500';
        if (status === 'inactive') return 'bg-gray-400';
        if (status === 'active' && isOnline) return 'bg-emerald-500';
        if (status === 'active') return 'bg-amber-500';
        return 'bg-gray-400';
    };

    const isNewUser = (createdAt) => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(createdAt) >= thirtyDaysAgo;
    };

    const toggleColumn = (col) => {
        setVisibleColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-32">
            {/* Undo Toast */}
            {undoAction && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-4 text-sm">
                        <span>{undoAction.count || 1} user(s) {undoAction.action}</span>
                        {undoAction.userId && (
                            <button onClick={undoLastAction} className="flex items-center gap-1 text-amber-400 font-medium hover:underline">
                                <RotateCcw className="w-3.5 h-3.5" /> Undo
                            </button>
                        )}
                        <button onClick={() => setUndoAction(null)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* User Details Modal */}
            {showModal && userStats && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-semibold">
                                    {userStats.user.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{userStats.user.name}</h3>
                                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(userStats.user.status, userStats.user.isOnline)} ${userStats.user.isOnline ? 'animate-pulse' : ''}`} />
                                        {userStats.user.emailVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                                    </div>
                                    <p className="text-gray-500 text-sm">{userStats.user.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-semibold text-gray-900">{userStats.stats.orderCount}</p>
                                    <p className="text-xs text-gray-500">Orders</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-semibold text-gray-900">₹{userStats.stats.totalSpent.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Total Spent</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-semibold text-gray-900">₹{userStats.stats.avgOrderValue}</p>
                                    <p className="text-xs text-gray-500">Avg Order</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowModal(false); navigate(`/admin/users/${userStats.user.id}`); }}
                                    className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 text-sm"
                                >
                                    View Full Profile
                                </button>
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 text-sm">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hover Preview Card */}
            {hoveredUser && (
                <div
                    className="fixed z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 pointer-events-none"
                    style={{ top: hoveredUser.y + 20, left: Math.min(hoveredUser.x, window.innerWidth - 280) }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                            {hoveredUser.user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium text-sm text-gray-900">{hoveredUser.user.name}</p>
                            <p className="text-xs text-gray-500">{hoveredUser.user.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-400">Last Login</p>
                            <p className="font-medium text-gray-700">{hoveredUser.user.lastLogin ? new Date(hoveredUser.user.lastLogin).toLocaleDateString() : 'Never'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                            <p className="text-gray-400">Joined</p>
                            <p className="font-medium text-gray-700">{new Date(hoveredUser.user.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-6 py-8">
                <h1 className="text-xl font-semibold text-gray-900 mb-6 capitalize">
                    {activeTab === 'dashboard' ? `Welcome, ${user?.name}` : activeTab}
                </h1>

                {/* Dashboard */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Users" value={stats?.users || 0} icon={Users} trend={12} />
                        <StatCard label="Sellers" value={stats?.sellers || 0} icon={Store} trend={8} />
                        <StatCard label="Listings" value={stats?.listings || 0} icon={Package} trend={15} />
                        <StatCard label="Admins" value={stats?.admins || 0} icon={Users} trend={0} />
                    </div>
                )}

                {/* Users */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">{quickStats.total}</p>
                                    <p className="text-xs text-gray-500">Total Users</p>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">{quickStats.activeToday}</p>
                                    <p className="text-xs text-gray-500">Active Today</p>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                                    <Ban className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">{quickStats.blocked}</p>
                                    <p className="text-xs text-gray-500">Blocked</p>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">{quickStats.newUsers}</p>
                                    <p className="text-xs text-gray-500">New (30d)</p>
                                </div>
                            </div>
                        </div>

                        {/* Search, Filter, Export */}
                        <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                        className="bg-transparent outline-none text-sm w-40"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            <div className="flex gap-2 items-center">
                                <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 mr-2">
                                    <Keyboard className="w-3 h-3" />
                                    <span>B: Block • D: Delete</span>
                                </div>

                                {selectedUsers.length > 0 && (
                                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                                        <span className="text-xs font-medium text-gray-700">{selectedUsers.length} selected</span>
                                        <button onClick={() => bulkAction('block')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-700">Block</button>
                                        <button onClick={() => bulkAction('unblock')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-700">Unblock</button>
                                        <button onClick={() => bulkAction('delete')} className="text-xs px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                                    </div>
                                )}

                                <button
                                    onClick={() => setDenseView(!denseView)}
                                    className={`p-2 rounded-lg border ${denseView ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
                                    title={denseView ? 'Comfortable View' : 'Dense View'}
                                >
                                    <Columns className="w-4 h-4 text-gray-600" />
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                                        className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg"
                                        title="Column Settings"
                                    >
                                        <Settings className="w-4 h-4 text-gray-600" />
                                    </button>
                                    {showColumnSettings && (
                                        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30 w-44">
                                            <p className="text-xs font-medium text-gray-500 mb-2">Show Columns</p>
                                            {['user', 'email', 'status', 'joined', 'actions'].map(col => (
                                                <label key={col} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.includes(col)}
                                                        onChange={() => toggleColumn(col)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="capitalize text-gray-700">{col}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button onClick={exportUsers} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left`}>
                                            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-gray-300" />
                                        </th>
                                        {visibleColumns.includes('user') && (
                                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer select-none`} onClick={() => handleSort('name')}>
                                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    User {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('email') && (
                                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer select-none`} onClick={() => handleSort('email')}>
                                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email {sortBy === 'email' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('status') && (
                                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer select-none`} onClick={() => handleSort('status')}>
                                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('joined') && (
                                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer select-none`} onClick={() => handleSort('createdAt')}>
                                                <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Joined {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.includes('actions') && (
                                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="border-b border-gray-50 animate-pulse">
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="w-4 h-4 bg-gray-100 rounded" /></td>
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-100 rounded-full" /><div className="w-24 h-4 bg-gray-100 rounded" /></div></td>
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="w-32 h-4 bg-gray-100 rounded" /></td>
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="w-16 h-5 bg-gray-100 rounded" /></td>
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="w-20 h-4 bg-gray-100 rounded" /></td>
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}><div className="w-20 h-8 bg-gray-100 rounded" /></td>
                                            </tr>
                                        ))
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan="6" className="py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="w-10 h-10 text-gray-300" />
                                                <p className="text-gray-500 text-sm">No users found</p>
                                            </div>
                                        </td></tr>
                                    ) : users.map((u) => (
                                        <tr
                                            key={u._id}
                                            className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectedUsers.includes(u._id) ? 'bg-gray-50' : ''}`}
                                            onMouseEnter={(e) => setHoveredUser({ user: u, x: e.clientX, y: e.clientY })}
                                            onMouseLeave={() => setHoveredUser(null)}
                                        >
                                            <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(u._id)}
                                                    onChange={() => toggleSelectUser(u._id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            {visibleColumns.includes('user') && (
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/admin/users/${u._id}`)}>
                                                        <div className={`${denseView ? 'w-8 h-8 text-sm' : 'w-9 h-9'} rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold relative`}>
                                                            {u.name?.charAt(0)?.toUpperCase()}
                                                            <div className={`absolute -bottom-0.5 -right-0.5 ${denseView ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full border-2 border-white ${getStatusColor(u.status || 'active', u.isOnline)} ${u.isOnline ? 'animate-pulse' : ''}`} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-medium text-sm text-gray-900 hover:underline">{u.name}</span>
                                                                {u.emailVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                                                                {isNewUser(u.createdAt) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">New</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.includes('email') && (
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-600 text-sm`}>{u.email}</td>
                                            )}
                                            {visibleColumns.includes('status') && (
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                                    <StatusBadge status={u.status || 'active'} isOnline={u.isOnline} />
                                                </td>
                                            )}
                                            {visibleColumns.includes('joined') && (
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-500 text-sm`}>
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </td>
                                            )}
                                            {visibleColumns.includes('actions') && (
                                                <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => window.location.href = `mailto:${u.email}`} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Send Email">
                                                            <Mail className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => navigate(`/admin/users/${u._id}?tab=orders`)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="View Orders">
                                                            <ShoppingBag className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => blockUser(u._id, (u.status || 'active') !== 'blocked')} className={`p-1.5 rounded ${u.status === 'blocked' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-600'}`} title={u.status === 'blocked' ? 'Unblock' : 'Block'}>
                                                            {u.status === 'blocked' ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                        </button>
                                                        <button onClick={() => deleteUser(u._id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete User">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                                <span className="text-sm text-gray-500">
                                    Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={pagination.page <= 1}
                                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                                className={`w-8 h-8 rounded text-sm font-medium ${pagination.page === pageNum ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        disabled={pagination.page >= pagination.pages}
                                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                        className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sellers */}
                {activeTab === 'sellers' && (
                    <DataTable
                        title="Sellers"
                        data={sellers}
                        loading={loading}
                        columns={['Name', 'Store', 'Status', 'Actions']}
                        renderRow={(s) => (
                            <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="py-4 px-4"><div><p className="font-medium text-sm text-gray-900">{s.name}</p><p className="text-xs text-gray-500">{s.email}</p></div></td>
                                <td className="py-4 px-4 text-gray-600 text-sm">{s.store || 'N/A'}</td>
                                <td className="py-4 px-4"><StatusBadge status={s.status || 'active'} /></td>
                                <td className="py-4 px-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => blockUser(s._id, s.status !== 'blocked')} className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">
                                            {s.status === 'blocked' ? 'Unblock' : 'Block'}
                                        </button>
                                        <button onClick={() => deleteUser(s._id)} className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    />
                )}

                {/* Products */}
                {activeTab === 'products' && (
                    <div className="space-y-6">
                        {listings.filter(l => l.deleteRequested).length > 0 && (
                            <DataTable
                                title="Deletion Requests"
                                data={listings.filter(l => l.deleteRequested)}
                                loading={loading}
                                columns={['Product', 'Price', 'Seller', 'Actions']}
                                renderRow={(l) => (
                                    <tr key={l._id} className="border-b border-gray-50 hover:bg-red-50/50">
                                        <td className="py-4 px-4 font-medium text-sm text-gray-900">{l.title}</td>
                                        <td className="py-4 px-4 text-sm">₹{l.price}</td>
                                        <td className="py-4 px-4 text-gray-600 text-sm">{l.store || 'N/A'}</td>
                                        <td className="py-4 px-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => deleteListing(l._id)} className="text-xs px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600">Approve</button>
                                                <button onClick={() => rejectDeletion(l._id)} className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            />
                        )}
                        <DataTable
                            title="All Products"
                            data={listings}
                            loading={loading}
                            columns={['Product', 'Price', 'Seller', 'Actions']}
                            renderRow={(l) => (
                                <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-4 px-4 font-medium text-sm text-gray-900">{l.title || 'Untitled'}</td>
                                    <td className="py-4 px-4 text-sm">₹{l.price || 0}</td>
                                    <td className="py-4 px-4 text-gray-600 text-sm">{l.store || 'N/A'}</td>
                                    <td className="py-4 px-4">
                                        <button onClick={() => deleteListing(l._id)} className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                                    </td>
                                </tr>
                            )}
                        />
                    </div>
                )}

                {/* Placeholder */}
                {['orders', 'shipments', 'coupons', 'disputes', 'reports', 'security'].includes(activeTab) && (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-gray-900 capitalize mb-2">{activeTab}</h2>
                        <p className="text-gray-500 text-sm">Coming soon</p>
                    </div>
                )}
            </main>

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
            `}</style>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, trend }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-600" />
            </div>
            {trend !== 0 && (
                <span className={`text-xs font-medium flex items-center gap-1 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </span>
            )}
        </div>
        <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
    </div>
);

const StatusBadge = ({ status, isOnline }) => {
    let styles = 'bg-gray-100 text-gray-600';
    let label = status;

    if (status === 'active' && isOnline) {
        styles = 'bg-emerald-50 text-emerald-700';
        label = 'Online';
    } else if (status === 'active') {
        styles = 'bg-gray-100 text-gray-600';
        label = 'Offline';
    } else if (status === 'blocked') {
        styles = 'bg-red-50 text-red-700';
    } else if (status === 'inactive') {
        styles = 'bg-gray-100 text-gray-500';
    }

    return <span className={`px-2 py-1 text-xs font-medium rounded ${styles}`}>{label}</span>;
};

const DataTable = ({ title, data, loading, columns, renderRow }) => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">{columns.map(col => <th key={col} className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>)}</tr>
                </thead>
                <tbody>
                    {loading ? <tr><td colSpan={columns.length} className="py-8 text-center text-gray-500 text-sm">Loading...</td></tr>
                        : data.length === 0 ? <tr><td colSpan={columns.length} className="py-8 text-center text-gray-500 text-sm">No data found</td></tr>
                            : data.map(renderRow)}
                </tbody>
            </table>
        </div>
    </div>
);

export default Admin;
