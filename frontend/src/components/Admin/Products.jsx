import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    Search, Download, Package, Eye, Trash2, AlertTriangle, Check, X,
    Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RefreshCw,
    SlidersHorizontal, DollarSign, Archive, Store, Clock, CheckCircle, XCircle
} from 'lucide-react';

// Helper to extract image URL from various formats
const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.large || img.thumb || img.hi_res || img.variant || img.url || null;
};

// Helper to format date with time
const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// Helper for relative time - Today/Yesterday with time, or full date for older
const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const d = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (dateOnly.getTime() === today.getTime()) {
        return `Today, ${timeStr}`;
    } else if (dateOnly.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeStr}`;
    } else {
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    }
};

const Products = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [deletionRequests, setDeletionRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });

    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    const [showFilters, setShowFilters] = useState(false);
    const [quickStats, setQuickStats] = useState({ total: 0, active: 0, outOfStock: 0, pendingDeletion: 0 });
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportPageRange, setExportPageRange] = useState({ from: 1, to: 1 });
    const [exportLoading, setExportLoading] = useState(false);

    // Export products
    const exportProducts = async (mode) => {
        setExportLoading(true);
        let productsToExport = [];
        let fileName = 'products';

        try {
            // Build filter params
            const baseParams = {
                ...(searchQuery && { search: searchQuery }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(categoryFilter !== 'all' && { category: categoryFilter }),
                ...(stockFilter !== 'all' && { stockStatus: stockFilter }),
                ...(priceRange.min && { minPrice: priceRange.min }),
                ...(priceRange.max && { maxPrice: priceRange.max }),
                sortBy, sortOrder
            };

            if (mode === 'current') {
                productsToExport = products;
                fileName = `page_${pagination.page}_products_${products.length}`;
            } else if (mode === 'range') {
                const fromPage = Math.max(1, exportPageRange.from);
                const toPage = Math.min(pagination.pages || 1, exportPageRange.to);
                let allData = [];
                for (let p = fromPage; p <= toPage; p++) {
                    const res = await apiClient.get('/api/admin/listings', {
                        params: { ...baseParams, page: p, limit: pagination.limit }
                    });
                    allData = allData.concat(res.data?.listings || []);
                }
                productsToExport = allData;
                fileName = `pages_${fromPage}-${toPage}_products_${allData.length}`;
            } else {
                // 'all' - fetch ALL with current filters
                const res = await apiClient.get('/api/admin/listings', {
                    params: { ...baseParams, limit: 10000 }
                });
                productsToExport = res.data?.listings || [];
                fileName = `all_products_${productsToExport.length}`;
            }

            const csv = [
                ['Title', 'Store', 'Price', 'Stock', 'Status', 'Category', 'Created At'].join(','),
                ...productsToExport.map(p => [
                    `"${(p.title || '').replace(/"/g, '""')}"`,
                    `"${(p.store || '').replace(/"/g, '""')}"`,
                    p.price || 0,
                    p.stock || 0,
                    p.deleteRequested ? 'Pending Delete' : (p.stock > 0 ? 'Active' : 'Out of Stock'),
                    p.category || '',
                    new Date(p.createdAt).toLocaleString()
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

    useEffect(() => {
        loadProducts();
        loadDeletionRequests();
    }, [pagination.page, pagination.limit, statusFilter, categoryFilter, stockFilter, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page !== 1) setPagination(p => ({ ...p, page: 1 }));
            else loadProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, priceRange]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page, limit: pagination.limit, search: searchQuery, status: statusFilter,
                category: categoryFilter, stockStatus: stockFilter, minPrice: priceRange.min,
                maxPrice: priceRange.max, sortBy, sortOrder
            };
            const res = await apiClient.get('/api/admin/listings', { params });
            setProducts(res.data?.listings || []);
            if (res.data?.pagination) setPagination(prev => ({ ...prev, ...res.data.pagination }));
        } catch (err) { console.error('Failed to load products:', err); }
        finally { setLoading(false); }
    };

    const loadDeletionRequests = async () => {
        try {
            const res = await apiClient.get('/api/admin/listings', { params: { status: 'pending_delete', limit: 100 } });
            setDeletionRequests(res.data?.listings || []);
            setQuickStats(prev => ({ ...prev, pendingDeletion: res.data?.listings?.length || 0 }));
        } catch (e) { }
    };

    useEffect(() => {
        apiClient.get('/api/admin/stats').then(res => {
            const listings = res.data.listings || 0;
            const activeCount = res.data.activeListings || 0;
            const outOfStockCount = res.data.outOfStockListings || 0;
            setQuickStats(prev => ({
                ...prev,
                total: listings,
                active: activeCount,
                outOfStock: outOfStockCount
            }));
        }).catch(() => { });
    }, []);

    const deleteProduct = async (id, e) => {
        e?.stopPropagation();
        if (!window.confirm('Delete this product permanently?')) return;
        try { await apiClient.delete(`/api/admin/${id}/approve-delete`); loadProducts(); loadDeletionRequests(); } catch { alert('Failed'); }
    };
    const approveDelete = async (id) => {
        if (!window.confirm('Approve deletion?')) return;
        try { await apiClient.delete(`/api/admin/${id}/approve-delete`); loadDeletionRequests(); loadProducts(); } catch { alert('Failed'); }
    };
    const rejectDelete = async (id) => {
        if (!window.confirm('Reject deletion?')) return;
        try { await apiClient.patch(`/api/admin/${id}/reject-delete`); loadDeletionRequests(); loadProducts(); } catch { alert('Failed'); }
    };
    const handleSort = (key) => { if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortOrder('desc'); } };
    const clearFilters = () => { setStatusFilter('all'); setCategoryFilter('all'); setStockFilter('all'); setPriceRange({ min: '', max: '' }); setSearchQuery(''); setPagination(p => ({ ...p, page: 1 })); };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Total Products" value={quickStats.total} icon={Package} />
                <StatCard label="Active (In Stock)" value={quickStats.active} icon={CheckCircle} color="text-green-600" />
                <StatCard label="Out of Stock" value={quickStats.outOfStock} icon={XCircle} color="text-orange-600" />
                <StatCard label="Deletion Requests" value={quickStats.pendingDeletion} icon={AlertTriangle} color="text-red-600" />
                <StatCard label="Showing" value={pagination.total} sublabel="match filters" icon={Filter} color="text-indigo-600" />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>All Products</button>
                <button onClick={() => setActiveTab('deletion_requests')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'deletion_requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    Deletion Requests
                    {quickStats.pendingDeletion > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{quickStats.pendingDeletion}</span>}
                </button>
            </div>

            {activeTab === 'all' && (
                <>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50 w-full md:w-auto">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-sm w-full md:w-56" />
                                </div>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                                    <option value="all">All Status</option>
                                    <option value="active">Active (In Stock)</option>
                                    <option value="out_of_stock">Out of Stock</option>
                                    <option value="pending_delete">Pending Deletion</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowFilters(!showFilters)} className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 ${showFilters ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <SlidersHorizontal className="w-4 h-4" />{showFilters ? 'Hide' : 'Filters'}
                                </button>
                                <button onClick={loadProducts} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>

                                {/* Export Dropdown */}
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
                                            <button
                                                onClick={() => exportProducts('current')}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>Current Page</span>
                                                <span className="text-xs text-gray-400">Page {pagination.page} ({products.length})</span>
                                            </button>
                                            <div className="border-t border-gray-100 my-2" />
                                            <div className="px-4 py-2">
                                                <p className="text-xs text-gray-500 mb-2">Page Range</p>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={pagination.pages || 1}
                                                        value={exportPageRange.from}
                                                        onChange={(e) => setExportPageRange(p => ({ ...p, from: parseInt(e.target.value) || 1 }))}
                                                        className="w-16 text-sm border border-gray-200 rounded px-2 py-1"
                                                    />
                                                    <span className="text-gray-400">to</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={pagination.pages || 1}
                                                        value={exportPageRange.to}
                                                        onChange={(e) => setExportPageRange(p => ({ ...p, to: parseInt(e.target.value) || 1 }))}
                                                        className="w-16 text-sm border border-gray-200 rounded px-2 py-1"
                                                    />
                                                    <button
                                                        onClick={() => exportProducts('range')}
                                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                                                    >
                                                        Export
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-gray-400">Total pages: {pagination.pages || 1}</p>
                                            </div>
                                            <div className="border-t border-gray-100 my-2" />
                                            <button
                                                onClick={() => exportProducts('all')}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span className="font-medium">All (Filtered)</span>
                                                <span className="text-xs text-gray-400">~{pagination.total} products</span>
                                            </button>
                                            <p className="px-4 text-[10px] text-gray-400">Exports all products matching current filters</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {showFilters && (
                            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="all">All</option><option value="Clothing">Clothing</option><option value="Jewelry">Jewelry</option><option value="Home Decor">Home Decor</option></select>
                                </div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                                    <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="all">All</option><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option></select>
                                </div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Price Range</label>
                                    <div className="flex items-center gap-2"><input type="number" placeholder="Min" value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /><span>-</span><input type="number" placeholder="Max" value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                                </div>
                                <div className="flex items-end"><button onClick={clearFilters} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Clear All</button></div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-500">{pagination.total} products</span>
                            <select value={sortBy} onChange={e => handleSort(e.target.value)} className="text-sm border-0 text-gray-600 bg-transparent cursor-pointer">
                                <option value="createdAt">Newest</option><option value="price">Price</option><option value="title">Name</option>
                            </select>
                        </div>
                        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : products.length === 0 ? <div className="p-8 text-center text-gray-400">No products found</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                                {products.map(product => (
                                    <div key={product._id} onClick={() => navigate(`/admin/products/${product._id}`)} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg transition-all cursor-pointer">
                                        <div className="relative h-40 bg-gray-100 overflow-hidden">
                                            {getImageUrl(product.images?.[0]) ? <img src={getImageUrl(product.images[0])} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-12 h-12" /></div>}
                                            {product.deleteRequested && <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">Delete Req</span>}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={e => { e.stopPropagation(); navigate(`/admin/products/${product._id}`); }} className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"><Eye className="w-4 h-4" /></button>
                                                <button onClick={e => deleteProduct(product._id, e)} className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-medium text-sm text-gray-900 truncate">{product.title || 'Untitled'}</h3>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Store className="w-3 h-3" />{product.store || 'Unknown'}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-semibold text-sm text-gray-900">₹{product.price?.toLocaleString() || 0}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${product.deleteRequested ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    (product.stock || 0) > 0 ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        'bg-orange-100 text-orange-700 border border-orange-200'
                                                    }`}>
                                                    {product.deleteRequested ? 'Pending Delete' : (product.stock || 0) > 0 ? 'Active' : 'Out of Stock'}
                                                </span>
                                            </div>
                                            {/* Timestamp */}
                                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                                <span className="flex items-center gap-1" title={`Listed: ${formatDateTime(product.createdAt)}`}>
                                                    <Clock className="w-3 h-3" /> Listed {formatRelativeTime(product.createdAt)}
                                                </span>
                                                <span className="text-gray-500">{(product.stock || 0)} stock</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && products.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                                <div className="flex items-center gap-2">
                                    <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                                    <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'deletion_requests' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                            <div><h2 className="font-semibold text-gray-900">Deletion Requests</h2><p className="text-sm text-gray-500">Products awaiting approval</p></div>
                        </div>
                        <button onClick={loadDeletionRequests} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
                    </div>
                    {deletionRequests.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-gray-400" /></div>
                            <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
                            <p className="text-gray-500 text-sm mt-1">No pending deletion requests</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {deletionRequests.map(product => (
                                <div key={product._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {getImageUrl(product.images?.[0]) ? <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-gray-900 truncate">{product.title || 'Untitled'}</h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-1"><Store className="w-3.5 h-3.5" />{product.store || 'Unknown'} • ₹{product.price?.toLocaleString()}</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3" />
                                                Requested {formatRelativeTime(product.deleteRequestedAt || product.updatedAt)}
                                                <span className="text-gray-300">({formatDateTime(product.deleteRequestedAt || product.updatedAt)})</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={() => navigate(`/admin/products/${product._id}`)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">View</button>
                                        <button onClick={() => rejectDelete(product._id)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Reject</button>
                                        <button onClick={() => approveDelete(product._id)} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Approve</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, sublabel, icon: Icon, color = 'text-gray-900' }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
        {Icon && <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>}
        <div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            {sublabel && <p className="text-[10px] text-gray-400">{sublabel}</p>}
        </div>
    </div>
);

export default Products;
