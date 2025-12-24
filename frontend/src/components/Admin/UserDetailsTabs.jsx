import React from 'react';
import { Package, MapPin, Star, Heart, Activity, MessageSquare, Tag } from 'lucide-react';

export const OrdersTab = ({ orders }) => {
    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No orders yet</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                        <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-4 px-4 font-mono text-sm text-gray-900">{order._id.slice(-8)}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString()}
                                <span className="block text-xs text-gray-400">
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">{order.items?.length || 0} items</td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">₹{order.payment?.amount || order.total || 0}</td>
                            <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                                    order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                        'bg-amber-50 text-amber-700'
                                    }`}>
                                    {order.status || 'pending'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const AddressesTab = ({ addresses }) => {
    if (addresses.length === 0) {
        return (
            <div className="text-center py-12">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No addresses saved</p>
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {addresses.map(addr => (
                <div key={addr._id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{addr.label || 'Address'}</span>
                        {addr.is_default && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Default</span>}
                    </div>
                    <p className="text-gray-600 text-sm">
                        {addr.street}, {addr.city}<br />
                        {addr.state} - {addr.zip}
                    </p>
                </div>
            ))}
        </div>
    );
};

export const ReviewsTab = ({ reviews }) => {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12">
                <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No reviews written</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => (
                <div key={review._id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            ))}
                        </div>
                        <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{review.comment}</p>
                    <p className="text-xs text-gray-500">Product: {review.productName || review.listing_id}</p>
                </div>
            ))}
        </div>
    );
};

export const WishlistTab = ({ wishlist }) => {
    if (wishlist.length === 0) {
        return (
            <div className="text-center py-12">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Wishlist is empty</p>
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-4">
            {wishlist.map(item => (
                <div key={item._id} className="p-4 border border-gray-200 rounded-lg flex items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.title || 'Product'}</p>
                        <p className="text-gray-900 font-semibold">₹{item.price || 0}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const ActivityTab = ({ activityLog }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'blocked': return 'bg-red-50 text-red-700 border-red-200';
            case 'inactive': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'suspended': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'verified': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'status_change': return <div className="w-3 h-3 rounded-full bg-amber-400" />;
            case 'verification_event': return <div className="w-3 h-3 rounded-full bg-green-500" />;
            case 'admin_event': return <div className="w-3 h-3 rounded-full bg-purple-500" />;
            case 'security_event': return <div className="w-3 h-3 rounded-full bg-red-400" />;
            default: return <div className="w-2 h-2 rounded-full bg-indigo-500" />;
        }
    };

    if (!activityLog || activityLog.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No activity recorded</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {activityLog.map((activity, i) => (
                    <div key={i} className="relative flex gap-4 pb-6">
                        {/* Timeline dot */}
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                            {getActivityIcon(activity.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            {activity.type === 'status_change' ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(activity.from)}`}>
                                            {activity.from || 'Unknown'}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(activity.to)}`}>
                                            {activity.to || 'Unknown'}
                                        </span>
                                    </div>

                                    {activity.reason && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            <span className="font-medium">Reason:</span> {activity.reason}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span>
                                            By: <span className="font-medium text-gray-700">{activity.by || 'Admin'}</span>
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </>
                            ) : activity.type === 'verification_event' ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-gray-900">{activity.action}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor('verified')}`}>
                                            ✓ Verified
                                        </span>
                                    </div>
                                    {activity.value && (
                                        <p className="text-sm text-gray-600 mb-2">
                                            <span className="font-medium capitalize">{activity.field}:</span> {activity.value}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        Verified on {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-medium text-gray-900 mb-1">{activity.action || activity.event_type || 'Activity'}</p>
                                    {activity.admin_action && (
                                        <p className="text-sm text-gray-600 mb-1">
                                            {activity.admin_action.action_type?.replace(/_/g, ' ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const NotesTab = ({ notes, newNote, setNewNote, addNote }) => {
    return (
        <div>
            <div className="flex gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button
                    onClick={addNote}
                    className="px-5 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                    Add Note
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No notes yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notes.map(note => (
                        <div key={note._id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                            <p className="text-gray-800 text-sm">{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                {note.createdBy?.name || 'Admin'} • {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const StatusHistoryTab = ({ statusHistory = [] }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'blocked': return 'bg-red-50 text-red-700 border-red-200';
            case 'inactive': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'suspended': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    if (!statusHistory || statusHistory.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No status changes recorded</p>
            </div>
        );
    }

    // Sort by timestamp descending (most recent first)
    const sortedHistory = [...statusHistory].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {sortedHistory.map((entry, index) => (
                    <div key={index} className="relative flex gap-4 pb-6">
                        {/* Timeline dot */}
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(entry.from)}`}>
                                    {entry.from || 'Unknown'}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(entry.to)}`}>
                                    {entry.to || 'Unknown'}
                                </span>
                            </div>

                            {entry.reason && (
                                <p className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Reason:</span> {entry.reason}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span>
                                    By: <span className="font-medium text-gray-700">{entry.changedByName || 'Admin'}</span>
                                </span>
                                <span>•</span>
                                <span>
                                    {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
