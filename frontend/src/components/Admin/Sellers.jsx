import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    Search, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Store, Package,
    TrendingUp, Ban, Shield, Trash2, Eye, MapPin, Star, BadgeCheck,
    Filter, X, Calendar, Wifi, Settings, Columns, RotateCcw
} from 'lucide-react';

const Sellers = () => {
    const navigate = useNavigate();
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [verifiedFilter, setVerifiedFilter] = useState('all');
    const [joinedFilter, setJoinedFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('');
    const [isOnlineFilter, setIsOnlineFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [joinedFrom, setJoinedFrom] = useState('');
    const [joinedTo, setJoinedTo] = useState('');

    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
    const [quickStats, setQuickStats] = useState({ total: 0, active: 0, blocked: 0, verified: 0 });

    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Bulk selection
    const [selectedSellers, setSelectedSellers] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Column settings
    const [denseView, setDenseView] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(['seller', 'store', 'email', 'phone', 'joined', 'rating', 'performance', 'lastActive', 'verification', 'status', 'actions']);
    const [showColumnSettings, setShowColumnSettings] = useState(false);

    // Undo
    const [undoAction, setUndoAction] = useState(null);

    // Last Active Filter
    const [lastActiveFilter, setLastActiveFilter] = useState('all');
    const [lastActiveDateRange, setLastActiveDateRange] = useState({ from: '', to: '' });

    // Helper: Relative time formatter
    const formatRelativeTime = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const d = new Date(date);
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    useEffect(() => {
        loadSellers();
    }, [pagination.page, searchQuery, statusFilter, verifiedFilter, joinedFilter, ratingFilter, isOnlineFilter, joinedFrom, joinedTo]);

    const loadSellers = async () => {
        setLoading(true);
        try {
            const params = {
                search: searchQuery,
                status: statusFilter,
                verified: verifiedFilter,
                minRating: ratingFilter,
                joinedWithin: joinedFilter !== 'custom' ? joinedFilter : undefined,
                dateFrom: joinedFilter === 'custom' ? joinedFrom : undefined,
                dateTo: joinedFilter === 'custom' ? joinedTo : undefined,
                isOnline: isOnlineFilter
            };

            const res = await apiClient.get('/api/admin/sellers', { params });
            const data = res.data || [];

            setSellers(data);
            setQuickStats({
                total: data.length,
                active: data.filter(s => s.status === 'active').length,
                blocked: data.filter(s => s.status === 'blocked').length,
                verified: data.filter(s => s.verification?.status === 'verified').length
            });
        } catch (err) {
            console.error('Failed to load sellers:', err);
        } finally {
            setLoading(false);
        }
    };

    const blockSeller = async (id, blocked) => {
        try {
            await apiClient.put(`/api/admin/users/${id}/block`, { blocked });
            loadSellers();
        } catch (err) {
            alert('Failed');
        }
    };

    const deleteSeller = async (id) => {
        if (!window.confirm('Delete this seller?')) return;
        try {
            await apiClient.delete(`/api/admin/users/${id}`);
            setUndoAction({ action: 'deleted', count: 1 });
            loadSellers();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    // Sorting
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Bulk selection
    const toggleSelectSeller = (sellerId) => {
        setSelectedSellers(prev =>
            prev.includes(sellerId) ? prev.filter(id => id !== sellerId) : [...prev, sellerId]
        );
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedSellers([]);
        } else {
            setSelectedSellers(sellers.map(s => s._id));
        }
        setSelectAll(!selectAll);
    };

    // Bulk actions
    const bulkAction = async (action) => {
        if (selectedSellers.length === 0) return;
        if (!window.confirm(`${action} ${selectedSellers.length} sellers?`)) return;

        try {
            for (const sellerId of selectedSellers) {
                if (action === 'block') {
                    await apiClient.put(`/api/admin/users/${sellerId}/block`, { blocked: true });
                } else if (action === 'unblock') {
                    await apiClient.put(`/api/admin/users/${sellerId}/block`, { blocked: false });
                } else if (action === 'delete') {
                    await apiClient.delete(`/api/admin/users/${sellerId}`);
                }
            }
            setUndoAction({ action, count: selectedSellers.length });
            setSelectedSellers([]);
            setSelectAll(false);
            loadSellers();
        } catch (err) {
            alert('Some actions failed');
        }
    };

    // Column toggle
    const toggleColumn = (col) => {
        setVisibleColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    // Export
    const exportSellers = async () => {
        const csv = [
            ['Name', 'Email', 'Store', 'Status', 'Rating', 'Verified', 'Joined'].join(','),
            ...sellers.map(s => [
                s.name,
                s.email,
                s.store || '',
                s.status || 'active',
                s.rating || 0,
                s.verification?.status || 'unverified',
                s.createdAt
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sellers.csv';
        a.click();
    };

    // Undo last action
    const undoLastAction = async () => {
        if (!undoAction) return;
        // For simplicity, just clear the undo state (full undo would need to store previous states)
        setUndoAction(null);
        loadSellers();
    };

    // Client-side sorting and filtering
    const sortedSellers = [...sellers]
        .filter(s => {
            if (lastActiveFilter === 'all') return true;
            if (lastActiveFilter === 'custom') {
                if (!s.lastLogin) return false;
                const lastLogin = new Date(s.lastLogin);
                const from = lastActiveDateRange.from ? new Date(lastActiveDateRange.from) : null;
                const to = lastActiveDateRange.to ? new Date(lastActiveDateRange.to + 'T23:59:59') : null;
                if (from && lastLogin < from) return false;
                if (to && lastLogin > to) return false;
                return true;
            }
            if (!s.lastLogin) return false;
            const now = new Date();
            const lastLogin = new Date(s.lastLogin);
            const diffHours = (now - lastLogin) / 3600000;
            switch (lastActiveFilter) {
                case '24h': return diffHours <= 24;
                case '7d': return diffHours <= 24 * 7;
                case '30d': return diffHours <= 24 * 30;
                default: return true;
            }
        })
        .sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            if (sortBy === 'rating') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });

    return (
        <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Store} label="Total Sellers" value={quickStats.total} color="bg-purple-50 text-purple-600" />
                <StatCard icon={TrendingUp} label="Active" value={quickStats.active} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={Ban} label="Blocked" value={quickStats.blocked} color="bg-red-50 text-red-600" />
                <StatCard icon={BadgeCheck} label="Verified" value={quickStats.verified} color="bg-blue-50 text-blue-600" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search sellers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-44"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStatusFilter(val);
                            if (val === 'blocked') setIsOnlineFilter('all');
                        }}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="all">Status: All</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showFilters ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {(verifiedFilter !== 'all' || joinedFilter !== 'all' || ratingFilter !== '' || isOnlineFilter !== 'all') && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Bulk Actions */}
                    {selectedSellers.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                            <span className="text-xs font-medium text-gray-700">{selectedSellers.length} selected</span>
                            <button onClick={() => bulkAction('block')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50">Block</button>
                            <button onClick={() => bulkAction('unblock')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50">Unblock</button>
                            <button onClick={() => bulkAction('delete')} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                        </div>
                    )}

                    {/* Dense View Toggle */}
                    <button
                        onClick={() => setDenseView(!denseView)}
                        className={`p-2 rounded-lg border ${denseView ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
                        title="Dense view"
                    >
                        <Columns className="w-4 h-4 text-gray-600" />
                    </button>

                    {/* Column Settings */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg"
                            title="Column settings"
                        >
                            <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                        {showColumnSettings && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30 w-48">
                                <p className="text-xs font-medium text-gray-500 mb-2">Show Columns</p>
                                {['seller', 'store', 'rating', 'stats', 'lastActive', 'verification', 'status', 'actions'].map(col => (
                                    <label key={col} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col)}
                                            onChange={() => toggleColumn(col)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="capitalize text-gray-700">{col === 'lastActive' ? 'Last Active' : col}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Gmail-style Pagination Controls */}
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-2">
                        <select
                            value={pagination.limit}
                            onChange={(e) => setPagination(p => ({ ...p, limit: parseInt(e.target.value), page: 1 }))}
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-600"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                            {sellers.length > 0 ? (
                                <>1-{sellers.length} of {sellers.length}</>
                            ) : (
                                <>0 of 0</>
                            )}
                        </span>
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Previous"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Next"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <button onClick={exportSellers} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Collapsible Filters Panel */}
            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Verification Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Verification</label>
                            <select
                                value={verifiedFilter}
                                onChange={(e) => setVerifiedFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All</option>
                                <option value="verified">Verified</option>
                                <option value="pending">Pending</option>
                                <option value="unverified">Unverified</option>
                            </select>
                        </div>

                        {/* Online Status Filter */}
                        <div className="flex flex-col gap-1">
                            <label className={`text-xs font-medium ${statusFilter === 'blocked' ? 'text-gray-300' : 'text-gray-500'}`}>Online Status</label>
                            <select
                                value={isOnlineFilter}
                                onChange={(e) => setIsOnlineFilter(e.target.value)}
                                disabled={statusFilter === 'blocked'}
                                className={`text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white ${statusFilter === 'blocked' ? 'text-gray-400 bg-gray-50' : ''}`}
                            >
                                <option value="all">All</option>
                                <option value="true">Online Now</option>
                                <option value="false">Offline</option>
                            </select>
                        </div>

                        {/* Rating Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Rating</label>
                            <select
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="">Any</option>
                                <option value="4">4+ Stars</option>
                                <option value="3">3+ Stars</option>
                            </select>
                        </div>

                        {/* Last Active Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Last Active</label>
                            <select
                                value={lastActiveFilter}
                                onChange={(e) => setLastActiveFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All Time</option>
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Last Active Custom Date Range */}
                        {lastActiveFilter === 'custom' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">From</label>
                                    <input
                                        type="date"
                                        value={lastActiveDateRange.from}
                                        onChange={(e) => setLastActiveDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">To</label>
                                    <input
                                        type="date"
                                        value={lastActiveDateRange.to}
                                        onChange={(e) => setLastActiveDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                    />
                                </div>
                            </>
                        )}

                        {/* Joined Date Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Joined Date</label>
                            <select
                                value={joinedFilter}
                                onChange={(e) => setJoinedFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All Time</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {joinedFilter === 'custom' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">From</label>
                                    <input
                                        type="date"
                                        value={joinedFrom}
                                        onChange={(e) => setJoinedFrom(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">To</label>
                                    <input
                                        type="date"
                                        value={joinedTo}
                                        onChange={(e) => setJoinedTo(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => {
                                setStatusFilter('all');
                                setVerifiedFilter('all');
                                setIsOnlineFilter('all');
                                setRatingFilter('');
                                setJoinedFilter('all');
                                setSearchQuery('');
                            }}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}


            {/* Sellers Table */}
            <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${denseView ? 'text-sm' : ''}`}>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            {/* Checkbox */}
                            <th className="py-3 px-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300"
                                />
                            </th>
                            {visibleColumns.includes('seller') && (
                                <th onClick={() => handleSort('name')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Seller
                                        {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('store') && (
                                <th onClick={() => handleSort('store')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Store
                                        {sortBy === 'store' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('email') && (
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            )}
                            {visibleColumns.includes('phone') && (
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                            )}
                            {visibleColumns.includes('joined') && (
                                <th onClick={() => handleSort('createdAt')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Joined
                                        {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('rating') && (
                                <th onClick={() => handleSort('rating')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Rating
                                        {sortBy === 'rating' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('performance') && (
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                            )}
                            {visibleColumns.includes('lastActive') && (
                                <th onClick={() => handleSort('lastLogin')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Last Active
                                        {sortBy === 'lastLogin' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('verification') && (
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Verification</th>
                            )}
                            {visibleColumns.includes('status') && (
                                <th onClick={() => handleSort('status')} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center gap-1">
                                        Status
                                        {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('actions') && (
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse border-b border-gray-100">
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-4"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                    <td className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                    <td className="py-3 px-4"><div className="h-8 bg-gray-100 rounded w-8"></div></td>
                                </tr>
                            ))
                        ) : sortedSellers.length === 0 ? (
                            <tr><td colSpan="9" className="py-12 text-center">
                                <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No sellers found match your filters</p>
                            </td></tr>
                        ) : sortedSellers.map(seller => (
                            <tr key={seller._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectedSellers.includes(seller._id) ? 'bg-blue-50/50' : ''}`}>
                                {/* Checkbox */}
                                <td className="py-3 px-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedSellers.includes(seller._id)}
                                        onChange={() => toggleSelectSeller(seller._id)}
                                        className="rounded border-gray-300"
                                    />
                                </td>
                                {visibleColumns.includes('seller') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/admin/sellers/${seller._id}`)}>
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold overflow-hidden">
                                                    {seller.store_logo ? (
                                                        <img src={seller.store_logo} alt={seller.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        seller.name?.charAt(0)?.toUpperCase()
                                                    )}
                                                </div>
                                                {/* Online Status Indicator */}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${seller.isOnline ? 'bg-green-500' : 'bg-gray-300'
                                                    }`} title={seller.isOnline ? "Online" : "Offline"}></div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900 hover:underline">{seller.name}</p>
                                                <p className="text-xs text-gray-500">{seller.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('store') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-1.5">
                                            <Store className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-sm text-gray-700">{seller.store || 'N/A'}</span>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('email') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-600 truncate max-w-[120px]">{seller.email}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${seller.emailVerified ? 'bg-green-500' : 'bg-gray-300'}`} title={seller.emailVerified ? `Verified ${formatRelativeTime(seller.emailVerifiedAt)}` : 'Not verified'}></span>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('phone') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-600">{seller.phone || 'N/A'}</span>
                                            {seller.phone && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${seller.phoneVerified ? 'bg-green-500' : 'bg-gray-300'}`} title={seller.phoneVerified ? `Verified ${formatRelativeTime(seller.phoneVerifiedAt)}` : 'Not verified'}></span>}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('joined') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <span className="text-xs text-gray-500" title={new Date(seller.createdAt).toLocaleString()}>
                                            {formatRelativeTime(seller.createdAt)}
                                        </span>
                                    </td>
                                )}
                                {visibleColumns.includes('rating') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-medium text-gray-900">{seller.rating?.toFixed(1) || '0.0'}</span>
                                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                            <span className="text-xs text-gray-400">({seller.rating_count || 0})</span>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('performance') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="w-24">
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                <span>Orders: {seller.orderCount || 0}</span>
                                                <span>Reviews: {seller.rating_count || 0}</span>
                                            </div>
                                            <div className="flex gap-0.5 h-2">
                                                <div className="bg-indigo-500 rounded-l" style={{ width: `${Math.min((seller.orderCount || 0) * 2, 50)}%` }} title={`${seller.orderCount || 0} orders`}></div>
                                                <div className="bg-amber-400 rounded-r" style={{ width: `${Math.min((seller.rating_count || 0) * 5, 50)}%` }} title={`${seller.rating_count || 0} reviews`}></div>
                                                <div className="bg-gray-200 flex-1 rounded-r"></div>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('lastActive') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <span className="text-xs text-gray-500" title={seller.lastLogin ? new Date(seller.lastLogin).toLocaleString() : 'Never logged in'}>
                                            {seller.isOnline ? <span className="text-green-600 font-medium">Online now</span> : formatRelativeTime(seller.lastLogin)}
                                        </span>
                                    </td>
                                )}
                                {visibleColumns.includes('verification') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${seller.identity_card?.verified ? 'bg-green-500' : 'bg-gray-300'}`} title={seller.identity_card?.verified ? 'ID Verified' : 'ID Not verified'}></span>
                                            {seller.verification?.status === 'verified' && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${seller.verification?.status === 'verified' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                seller.verification?.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                                    'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {seller.verification?.status || 'unverified'}
                                            </span>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('status') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        {(() => {
                                            if (seller.status === 'blocked') return (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium capitalize border bg-red-50 text-red-700 border-red-100">
                                                    Blocked
                                                </span>
                                            );
                                            if (seller.status === 'suspended') return (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium capitalize border bg-amber-50 text-amber-700 border-amber-100">
                                                    Suspended
                                                </span>
                                            );
                                            if (seller.isOnline) return (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium capitalize border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                    Online
                                                </span>
                                            );
                                            return (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium capitalize border bg-gray-100 text-gray-600 border-gray-200">
                                                    Offline
                                                </span>
                                            );
                                        })()}
                                    </td>
                                )}
                                {visibleColumns.includes('actions') && (
                                    <td className={`${denseView ? 'py-2' : 'py-3'} px-4`}>
                                        <div className="flex gap-1">
                                            <button onClick={() => navigate(`/admin/sellers/${seller._id}`)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => blockSeller(seller._id, seller.status !== 'blocked')} className={`p-1.5 rounded ${seller.status === 'blocked' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-600'}`} title={seller.status === 'blocked' ? 'Unblock' : 'Block'}>
                                                {seller.status === 'blocked' ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => deleteSeller(seller._id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div >
        </div >
    );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
        <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    </div>
);

export default Sellers;
