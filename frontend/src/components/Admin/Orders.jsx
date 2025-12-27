import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import {
    Search, Download, X, ChevronLeft, ChevronRight, Filter,
    ChevronDown, ShoppingBag, Truck, CheckCircle, XCircle
} from 'lucide-react';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // Date filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        loadOrders();
    }, [pagination.page, statusFilter, dateFrom, dateTo]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(dateFrom && { dateFrom }),
                ...(dateTo && { dateTo }),
            });
            const res = await apiClient.get(`/api/orders/admin?${params}`);
            setOrders(res.data.orders);
            if (res.data.total) { // Assuming backend returns total
                setPagination(prev => ({
                    ...prev,
                    total: res.data.total,
                    pages: Math.ceil(res.data.total / prev.limit)
                }));
            }
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-emerald-100 text-emerald-700';
            case 'created': return 'bg-blue-100 text-blue-700';
            case 'shipped': return 'bg-indigo-100 text-indigo-700';
            case 'delivered': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header / Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <h2 className="text-lg font-semibold text-gray-800 mr-4">Orders</h2>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Status</option>
                        <option value="created">Created</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none"
                            placeholder="From"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none"
                            placeholder="To"
                        />
                    </div>
                </div>

                {/* Refresh */}
                <button
                    onClick={loadOrders}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                    title="Refresh"
                >
                    <ShoppingBag className="w-5 h-5" />
                </button>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Order ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Buyer</th>
                            <th className="px-6 py-3">Shipping To</th>
                            <th className="px-6 py-3">Total</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                                    Loading orders...
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                                    No orders found.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <React.Fragment key={order._id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                            {order._id.substring(order._id.length - 8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                            <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.buyer ? (
                                                <div>
                                                    <div className="font-medium text-gray-900">{order.buyer.name}</div>
                                                    <div className="text-xs text-gray-500">{order.buyer.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Deleted User</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                                            <div title={`${order.shipping_address.line1}, ${order.shipping_address.city}`}>
                                                {order.shipping_address.city}, {order.shipping_address.state}
                                            </div>
                                            <div className="text-xs text-gray-400">{order.shipping_address.country}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₹{order.totals.total.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} uppercase tracking-wide`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                            >
                                                {expandedOrderId === order._id ? 'Hide Details' : 'View Details'}
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Expanded Details Row */}
                                    {expandedOrderId === order._id && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan="7" className="px-6 py-4">
                                                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Items</h4>
                                                    <div className="space-y-4">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex flex-col sm:flex-row gap-4 border-b last:border-0 border-gray-100 pb-4 last:pb-0">
                                                                {/* Product Image */}
                                                                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                                    {item.image ? (
                                                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                            <ShoppingBag size={20} />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Product Details */}
                                                                <div className="flex-grow min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-medium text-gray-900 text-sm truncate" title={item.title}>{item.title}</p>
                                                                            <p className="text-xs text-gray-400 mt-0.5">ID: {item.listing_id} | SKU: {item.sku || 'N/A'}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-medium text-gray-900">₹{item.price.toLocaleString()}</p>
                                                                            <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Description */}
                                                                    {item.description && (
                                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                                                    )}

                                                                    {/* Seller Info */}
                                                                    <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                                                                        <span className="font-semibold">Seller:</span>
                                                                        <span>{item.seller?.store || 'Unknown Store'}</span>
                                                                        <span className="text-indigo-400">|</span>
                                                                        <span>{item.seller?.name}</span>
                                                                        <span className="text-gray-400 ml-1">({item.seller?.id})</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shipping Address</h4>
                                                            <p className="text-sm text-gray-700">
                                                                {order.shipping_address.name}<br />
                                                                {order.shipping_address.line1}, {order.shipping_address.line2}<br />
                                                                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postal_code}<br />
                                                                {order.shipping_address.country}<br />
                                                                Phone: {order.shipping_address.phone}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-500">Subtotal:</span>
                                                                    <span>₹{order.totals.subtotal.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-500">Shipping:</span>
                                                                    <span>₹{order.totals.shipping.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                                                                    <span>Total:</span>
                                                                    <span>₹{order.totals.total.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-xs text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
                </span>
                <div className="flex gap-2">
                    <button
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
