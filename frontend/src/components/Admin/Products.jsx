import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    Search, Download, Package, Eye, Trash2, AlertTriangle, Check, X
} from 'lucide-react';

const Products = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [deletionRequests, setDeletionRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [quickStats, setQuickStats] = useState({ total: 0, active: 0, pendingDeletion: 0, outOfStock: 0 });

    useEffect(() => {
        loadProducts();
    }, [searchQuery, categoryFilter]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/admin/listings');
            let data = res.data || [];

            if (searchQuery) {
                data = data.filter(p =>
                    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.store?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            const pending = data.filter(p => p.deleteRequested);
            const active = data.filter(p => !p.deleteRequested);

            setDeletionRequests(pending);
            setProducts(active);

            setQuickStats({
                total: res.data?.length || 0,
                active: active.length,
                pendingDeletion: pending.length,
                outOfStock: data.filter(p => (p.stock || 0) <= 0).length
            });
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setLoading(false);
        }
    };

    const approveDelete = async (id) => {
        if (!window.confirm('Approve deletion?')) return;
        try {
            await apiClient.delete(`/api/admin/${id}/approve-delete`);
            loadProducts();
        } catch (err) {
            alert('Failed');
        }
    };

    const rejectDelete = async (id) => {
        if (!window.confirm('Reject?')) return;
        try {
            await apiClient.patch(`/api/admin/${id}/reject-delete`);
            loadProducts();
        } catch (err) {
            alert('Failed');
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await apiClient.delete(`/api/admin/${id}/approve-delete`);
            loadProducts();
        } catch (err) {
            alert('Failed');
        }
    };

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Products" value={quickStats.total} />
                <StatCard label="Active" value={quickStats.active} color="text-emerald-600" />
                <StatCard label="Pending Deletion" value={quickStats.pendingDeletion} color="text-amber-600" />
                <StatCard label="Out of Stock" value={quickStats.outOfStock} color="text-red-600" />
            </div>

            {/* Deletion Requests */}
            {deletionRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h2 className="font-semibold text-amber-800">Deletion Requests ({deletionRequests.length})</h2>
                    </div>
                    <div className="divide-y divide-amber-200">
                        {deletionRequests.map(product => (
                            <div key={product._id} className="px-5 py-3 flex items-center justify-between hover:bg-amber-100/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <Package className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-gray-900">{product.title || 'Untitled'}</p>
                                        <p className="text-xs text-gray-500">{product.store || 'Unknown seller'} • ₹{product.price || 0}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => approveDelete(product._id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600">
                                        <Check className="w-3 h-3" /> Approve
                                    </button>
                                    <button onClick={() => rejectDelete(product._id)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 bg-white rounded text-xs font-medium hover:bg-gray-50">
                                        <X className="w-3 h-3" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-44"
                        />
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Products Grid */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                {loading ? (
                    <div className="grid md:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="w-full h-36 bg-gray-100 rounded-lg mb-3" />
                                <div className="w-3/4 h-4 bg-gray-100 rounded mb-2" />
                                <div className="w-1/2 h-4 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No products found</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-4 gap-4">
                        {products.map(product => (
                            <div key={product._id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow group">
                                <div className="w-full h-36 bg-gray-100 flex items-center justify-center relative">
                                    {product.images?.[0] ? (
                                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button className="p-2 bg-white rounded-lg hover:bg-gray-100">
                                            <Eye className="w-4 h-4 text-gray-700" />
                                        </button>
                                        <button onClick={() => deleteProduct(product._id)} className="p-2 bg-white rounded-lg hover:bg-gray-100">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="font-medium text-sm text-gray-900 truncate">{product.title || 'Untitled'}</p>
                                    <p className="text-xs text-gray-500 mb-2">{product.store || 'Unknown'}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900">₹{product.price || 0}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${(product.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            {(product.stock || 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color = 'text-gray-900' }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
);

export default Products;
