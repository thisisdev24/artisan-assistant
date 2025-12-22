import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    Search, Download, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
    Mail, ShoppingBag, Trash2, Ban, Shield, BadgeCheck, RotateCcw, Settings,
    Columns, Keyboard, Activity, Sparkles, Users, Phone, Clock, Calendar,
    Filter, CheckCircle, XCircle, Wifi
} from 'lucide-react';

const UsersPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);


    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Joined date filter - presets or custom range
    const [joinedFilter, setJoinedFilter] = useState('all');
    const [joinedFrom, setJoinedFrom] = useState('');
    const [joinedTo, setJoinedTo] = useState('');
    // Last login filter - presets or custom time range
    const [lastLoginFilter, setLastLoginFilter] = useState('all');
    const [lastLoginCustomValue, setLastLoginCustomValue] = useState('1');
    const [lastLoginCustomUnit, setLastLoginCustomUnit] = useState('h'); // 'h' for hours, 'm' for minutes
    const [emailVerifiedFilter, setEmailVerifiedFilter] = useState('all');
    const [onlineFilter, setOnlineFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    const [quickStats, setQuickStats] = useState({ total: 0, activeToday: 0, blocked: 0, newUsers: 0 });
    const [denseView, setDenseView] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState(['user', 'email', 'phone', 'status', 'lastLogin', 'joined', 'actions']);
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [undoAction, setUndoAction] = useState(null);
    const [hoveredUser, setHoveredUser] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportPageRange, setExportPageRange] = useState({ from: 1, to: 1 });
    const [exportLoading, setExportLoading] = useState(false);

    // Debounce search input
    const searchTimeoutRef = useRef(null);
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPagination(p => ({ ...p, page: 1 }));
        }, 300);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery]);

    useEffect(() => {
        loadUsers();
    }, [pagination.page, debouncedSearch, statusFilter, joinedFilter, joinedFrom, joinedTo, lastLoginFilter, lastLoginCustomValue, lastLoginCustomUnit, emailVerifiedFilter, onlineFilter, sortBy, sortOrder]);

    useEffect(() => {
        const handleKeyDown = (e) => {
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
    }, [selectedUsers]);

    useEffect(() => {
        if (undoAction) {
            const timer = setTimeout(() => setUndoAction(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [undoAction]);

    const loadUsers = async () => {
        setLoading(true);
        setSelectedUsers([]);
        setSelectAll(false);
        try {
            // Build custom last login time string (e.g., '2h', '45m')
            const customLastLoginTime = lastLoginFilter === 'custom' && lastLoginCustomValue
                ? `${lastLoginCustomValue}${lastLoginCustomUnit}`
                : null;

            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
                // Joined date: preset or custom range
                ...(joinedFilter !== 'all' && joinedFilter !== 'custom' && { joinedWithin: joinedFilter }),
                ...(joinedFilter === 'custom' && joinedFrom && { dateFrom: joinedFrom }),
                ...(joinedFilter === 'custom' && joinedTo && { dateTo: joinedTo }),
                // Last login: preset or custom time
                ...(lastLoginFilter !== 'all' && lastLoginFilter !== 'custom' && { lastLoginWithin: lastLoginFilter }),
                ...(customLastLoginTime && { lastLoginWithin: customLastLoginTime }),
                ...(emailVerifiedFilter !== 'all' && { emailVerified: emailVerifiedFilter }),
                // Only include online filter when status is 'all' or 'active'
                ...((statusFilter === 'all' || statusFilter === 'active') && onlineFilter !== 'all' && { isOnline: onlineFilter }),
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
        } catch (err) {
            console.error('Failed to load users:', err);
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

            setUndoAction({ action, count: selectedUsers.length });
            loadUsers();
        } catch (err) {
            alert('Some actions failed');
        }
    };

    const blockUser = async (userId, blocked) => {
        const targetUser = users.find(u => u._id === userId);
        try {
            await apiClient.put(`/api/admin/users/${userId}/block`, { blocked });
            setUndoAction({
                action: blocked ? 'blocked' : 'unblocked',
                userId,
                previousState: !blocked
            });
            loadUsers();
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
            loadUsers();
        } catch (err) {
            alert('Undo failed');
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await apiClient.delete(`/api/admin/users/${userId}`);
            setUndoAction({ action: 'deleted', count: 1 });
            loadUsers();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const exportUsers = async (mode) => {
        setExportLoading(true);
        let usersToExport = [];
        let fileName = 'users';

        try {
            // Build filter params (same as loadUsers)
            const customLastLoginTime = lastLoginFilter === 'custom' && lastLoginCustomValue
                ? `${lastLoginCustomValue}${lastLoginCustomUnit}` : null;
            const baseParams = {
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(joinedFilter !== 'all' && joinedFilter !== 'custom' && { joinedWithin: joinedFilter }),
                ...(joinedFilter === 'custom' && joinedFrom && { dateFrom: joinedFrom }),
                ...(joinedFilter === 'custom' && joinedTo && { dateTo: joinedTo }),
                ...(lastLoginFilter !== 'all' && lastLoginFilter !== 'custom' && { lastLoginWithin: lastLoginFilter }),
                ...(customLastLoginTime && { lastLoginWithin: customLastLoginTime }),
                ...(emailVerifiedFilter !== 'all' && { emailVerified: emailVerifiedFilter }),
                ...((statusFilter === 'all' || statusFilter === 'active') && onlineFilter !== 'all' && { isOnline: onlineFilter }),
            };

            if (mode === 'selected') {
                if (selectedUsers.length === 0) {
                    alert('No users selected');
                    setExportLoading(false);
                    return;
                }
                usersToExport = users.filter(u => selectedUsers.includes(u._id));
                fileName = `selected_users_${selectedUsers.length}`;
            } else if (mode === 'current') {
                usersToExport = users;
                fileName = `page_${pagination.page}_users_${users.length}`;
            } else if (mode === 'range') {
                const fromPage = Math.max(1, exportPageRange.from);
                const toPage = Math.min(pagination.pages, exportPageRange.to);
                let allData = [];
                for (let p = fromPage; p <= toPage; p++) {
                    const res = await apiClient.get('/api/admin/users', {
                        params: { ...baseParams, page: p, limit: pagination.limit }
                    });
                    allData = allData.concat(res.data.users || res.data || []);
                }
                usersToExport = allData;
                fileName = `pages_${fromPage}-${toPage}_users_${allData.length}`;
            } else {
                // 'all' - fetch ALL with current filters
                const res = await apiClient.get('/api/admin/users', {
                    params: { ...baseParams, limit: 10000 }
                });
                usersToExport = res.data.users || res.data || [];
                fileName = `all_users_${usersToExport.length}`;
            }

            // Generate CSV
            const csv = [
                ['Name', 'Email', 'Phone', 'Status', 'Online', 'Email Verified', 'Phone Verified', 'Last Login', 'Joined'].join(','),
                ...usersToExport.map(u => [
                    `"${(u.name || '').replace(/"/g, '""')}"`,
                    u.email,
                    u.phone || '',
                    u.status || 'active',
                    u.isOnline ? 'Yes' : 'No',
                    u.email_verified ? 'Yes' : 'No',
                    u.phone_verified ? 'Yes' : 'No',
                    u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never',
                    new Date(u.createdAt).toLocaleString()
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed');
        } finally {
            setExportLoading(false);
            setShowExportMenu(false);
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

    const formatRelativeTime = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-4">
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

            {/* Hover Preview */}
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

            {/* Quick Stats */}
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

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-48"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
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
                        <option value="deleted">Deleted</option>
                    </select>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showFilters ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {(joinedFilter !== 'all' || lastLoginFilter !== 'all' || emailVerifiedFilter !== 'all' || ((statusFilter === 'all' || statusFilter === 'active') && onlineFilter !== 'all')) && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                    </button>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 mr-2">
                        <Keyboard className="w-3 h-3" />
                        <span>B: Block • D: Delete</span>
                    </div>

                    {selectedUsers.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                            <span className="text-xs font-medium text-gray-700">{selectedUsers.length} selected</span>
                            <button onClick={() => bulkAction('block')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded">Block</button>
                            <button onClick={() => bulkAction('unblock')} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded">Unblock</button>
                            <button onClick={() => bulkAction('delete')} className="text-xs px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                        </div>
                    )}

                    <button
                        onClick={() => setDenseView(!denseView)}
                        className={`p-2 rounded-lg border ${denseView ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Columns className="w-4 h-4 text-gray-600" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg"
                        >
                            <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                        {showColumnSettings && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-30 w-48">
                                <p className="text-xs font-medium text-gray-500 mb-2">Show Columns</p>
                                {['user', 'email', 'phone', 'status', 'lastLogin', 'joined', 'actions'].map(col => (
                                    <label key={col} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col)}
                                            onChange={() => toggleColumn(col)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="capitalize text-gray-700">{col === 'lastLogin' ? 'Last Login' : col}</span>
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
                            {pagination.total > 0 ? (
                                <>{(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</>
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

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={exportLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {exportLoading ? 'Exporting...' : 'Export'}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-30 w-64">
                                <p className="px-4 py-1 text-xs font-medium text-gray-400 uppercase">Export Options</p>
                                {selectedUsers.length > 0 && (
                                    <button
                                        onClick={() => exportUsers('selected')}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                    >
                                        <span>Selected Users</span>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{selectedUsers.length}</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => exportUsers('current')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>Current Page</span>
                                    <span className="text-xs text-gray-400">Page {pagination.page} ({users.length})</span>
                                </button>
                                <div className="border-t border-gray-100 my-2" />
                                <div className="px-4 py-2">
                                    <p className="text-xs text-gray-500 mb-2">Page Range</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={pagination.pages}
                                            value={exportPageRange.from}
                                            onChange={(e) => setExportPageRange(p => ({ ...p, from: parseInt(e.target.value) || 1 }))}
                                            className="w-16 text-sm border border-gray-200 rounded px-2 py-1"
                                        />
                                        <span className="text-gray-400">to</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={pagination.pages}
                                            value={exportPageRange.to}
                                            onChange={(e) => setExportPageRange(p => ({ ...p, to: parseInt(e.target.value) || 1 }))}
                                            className="w-16 text-sm border border-gray-200 rounded px-2 py-1"
                                        />
                                        <button
                                            onClick={() => exportUsers('range')}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                                        >
                                            Export
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400">Total pages: {pagination.pages}</p>
                                </div>
                                <div className="border-t border-gray-100 my-2" />
                                <button
                                    onClick={() => exportUsers('all')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span className="font-medium">All (Filtered)</span>
                                    <span className="text-xs text-gray-400">~{pagination.total} users</span>
                                </button>
                                <p className="px-4 text-[10px] text-gray-400">Exports all users matching current filters</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Filters Panel */}
            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Joined Date Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Joined Date</label>
                            <select
                                value={joinedFilter}
                                onChange={(e) => { setJoinedFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All Time</option>
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                                <option value="1y">Last 1 year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        {/* Joined Date Custom Range */}
                        {joinedFilter === 'custom' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">From</label>
                                    <input
                                        type="date"
                                        value={joinedFrom}
                                        onChange={(e) => { setJoinedFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">To</label>
                                    <input
                                        type="date"
                                        value={joinedTo}
                                        onChange={(e) => { setJoinedTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                                    />
                                </div>
                            </>
                        )}
                        {/* Last Login Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Last Login</label>
                            <select
                                value={lastLoginFilter}
                                onChange={(e) => { setLastLoginFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All Time</option>
                                <option value="15m">Last 15 minutes</option>
                                <option value="1h">Last 1 hour</option>
                                <option value="6h">Last 6 hours</option>
                                <option value="24h">Last 24 hours</option>
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        {/* Last Login Custom Range */}
                        {lastLoginFilter === 'custom' && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Time Period</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={lastLoginCustomValue}
                                        onChange={(e) => { setLastLoginCustomValue(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                        className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-2"
                                        placeholder="Value"
                                    />
                                    <select
                                        value={lastLoginCustomUnit}
                                        onChange={(e) => { setLastLoginCustomUnit(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                    >
                                        <option value="m">Minutes</option>
                                        <option value="h">Hours</option>
                                        <option value="d">Days</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        {/* Email Verified Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Email Verified</label>
                            <select
                                value={emailVerifiedFilter}
                                onChange={(e) => { setEmailVerifiedFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                            >
                                <option value="all">All</option>
                                <option value="true">Verified</option>
                                <option value="false">Not Verified</option>
                            </select>
                        </div>
                        {/* Online filter only shows when status is 'all' or 'active' */}
                        {(statusFilter === 'all' || statusFilter === 'active') && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">Online Status</label>
                                <select
                                    value={onlineFilter}
                                    onChange={(e) => { setOnlineFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                >
                                    <option value="all">All</option>
                                    <option value="true">Online</option>
                                    <option value="false">Offline</option>
                                </select>
                            </div>
                        )}
                        {/* Clear Filters Button */}
                        {(joinedFilter !== 'all' || lastLoginFilter !== 'all' || emailVerifiedFilter !== 'all' || ((statusFilter === 'all' || statusFilter === 'active') && onlineFilter !== 'all')) && (
                            <button
                                onClick={() => {
                                    setJoinedFilter('all');
                                    setJoinedFrom('');
                                    setJoinedTo('');
                                    setLastLoginFilter('all');
                                    setLastLoginCustomValue('1');
                                    setLastLoginCustomUnit('h');
                                    setEmailVerifiedFilter('all');
                                    setOnlineFilter('all');
                                    setPagination(p => ({ ...p, page: 1 }));
                                }}
                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 px-3 py-2"
                            >
                                <X className="w-3 h-3" />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left`}>
                                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-gray-300" />
                            </th>
                            {visibleColumns.includes('user') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer`} onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('email') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer`} onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email {sortBy === 'email' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('phone') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left`}>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</div>
                                </th>
                            )}
                            {visibleColumns.includes('status') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left`}>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
                                </th>
                            )}
                            {visibleColumns.includes('lastLogin') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer`} onClick={() => handleSort('lastLogin')}>
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login {sortBy === 'lastLogin' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.includes('joined') && (
                                <th className={`${denseView ? 'py-2' : 'py-3'} px-4 text-left cursor-pointer`} onClick={() => handleSort('createdAt')}>
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
                                                    {u.email_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                                                    {isNewUser(u.createdAt) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">New</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('email') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-600 text-sm`}>
                                        <div className="flex items-center gap-1.5">
                                            {u.email}
                                            {u.email_verified ? (
                                                <BadgeCheck className="w-3.5 h-3.5 text-blue-500" title="Email Verified" />
                                            ) : (
                                                <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">Unverified</span>
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('phone') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-500 text-sm`}>
                                        <div className="flex items-center gap-1">
                                            {u.phone || <span className="text-gray-300">N/A</span>}
                                            {u.phone && (
                                                u.phone_verified ? (
                                                    <BadgeCheck className="w-3.5 h-3.5 text-green-500" title="Phone Verified" />
                                                ) : (
                                                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">Unverified</span>
                                                )
                                            )}
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.includes('status') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                        <StatusBadge status={u.status || 'active'} isOnline={u.isOnline} />
                                    </td>
                                )}
                                {visibleColumns.includes('lastLogin') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-500 text-sm`}>
                                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : <span className="text-gray-300">Never</span>}
                                    </td>
                                )}
                                {visibleColumns.includes('joined') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4 text-gray-500 text-sm`}>
                                        {new Date(u.createdAt).toLocaleString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        })}
                                    </td>
                                )}
                                {visibleColumns.includes('actions') && (
                                    <td className={`${denseView ? 'py-2' : 'py-4'} px-4`}>
                                        <div className="flex gap-1">
                                            <button onClick={() => window.location.href = `mailto:${u.email}`} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => navigate(`/admin/users/${u._id}?tab=orders`)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                                                <ShoppingBag className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => blockUser(u._id, (u.status || 'active') !== 'blocked')} className={`p-1.5 rounded ${u.status === 'blocked' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-600'}`}>
                                                {u.status === 'blocked' ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => deleteUser(u._id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
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

export default UsersPage;
