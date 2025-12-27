import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Orders from '../components/Admin/Orders';

const SellerOrders = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-8 pt-20">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage orders for your products</p>
                    </div>
                    <button
                        onClick={() => navigate('/Seller')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>

                {/* Shared Orders Component */}
                <Orders />
            </div>
        </div>
    );
};

export default SellerOrders;

// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import apiClient from '../utils/apiClient';

// const SellerOrders = () => {
//     const navigate = useNavigate();
//     const [orders, setOrders] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     const fetchOrders = async () => {
//         try {
//             setLoading(true);
//             setError(null);
//             const response = await apiClient.get('/api/orders/seller');
//             setOrders(response.data.orders || []);
//         } catch (err) {
//             console.error('Failed to fetch orders', err);
//             setError(err?.response?.data?.message || 'Failed to load orders. Please try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchOrders();
//     }, []);

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
//                 Fetching the latest orders...
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-gray-50 px-6 py-10">
//             <div className="max-w-6xl mx-auto">
//                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
//                     <div>
//                         <h1 className="text-3xl font-bold text-gray-800">Orders from Buyers</h1>
//                         <p className="text-gray-500 text-sm mt-1">Every order that includes at least one of your products.</p>
//                     </div>
//                     <div className="flex gap-3">
//                         <button
//                             onClick={fetchOrders}
//                             className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold transition"
//                         >
//                             Refresh
//                         </button>
//                         <button
//                             onClick={() => navigate('/Seller')}
//                             className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-semibold transition"
//                         >
//                             Back to Dashboard
//                         </button>
//                     </div>
//                 </div>

//                 {error && (
//                     <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
//                         <span>{error}</span>
//                         <button onClick={fetchOrders} className="text-sm underline font-semibold">
//                             Retry
//                         </button>
//                     </div>
//                 )}

//                 {orders.length === 0 ? (
//                     <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
//                         <p className="text-lg">No orders yet.</p>
//                         <p className="text-sm">Your orders will appear here once customers start purchasing your listings.</p>
//                     </div>
//                 ) : (
//                     <div className="space-y-6">
//                         {orders.map(order => (
//                             <OrderCard key={order._id} order={order} />
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// const OrderCard = ({ order }) => {
//     const readableDate = new Date(order.createdAt).toLocaleString();
//     const totalAmount = order.totals?.total ?? order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

//     return (
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
//             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                 <div>
//                     <p className="text-sm text-gray-400 uppercase tracking-widest">Order #{String(order._id).slice(-6)}</p>
//                     <p className="text-lg font-semibold text-gray-800 mt-1">{order.buyer?.name || 'Buyer'}</p>
//                     {order.buyer?.email && (
//                         <p className="text-sm text-gray-500">{order.buyer.email}</p>
//                     )}
//                     {order.buyer?.phone && (
//                         <p className="text-sm text-gray-500">Phone: {order.buyer.phone}</p>
//                     )}
//                 </div>
//                 <div className="text-left md:text-right">
//                     <div className="space-x-2">
//                         <StatusPill label={order.status} />
//                         <StatusPill label={order.payment_status} color="emerald" />
//                         <StatusPill label={order.shipping_status} color="cyan" />
//                     </div>
//                     <p className="text-sm text-gray-500 mt-2">{readableDate}</p>
//                 </div>
//             </div>

//             {order.shipping_address && (
//                 <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
//                     <p className="font-semibold text-gray-800 mb-1">Ship To</p>
//                     <p>{order.shipping_address.name}</p>
//                     <p>{order.shipping_address.line1}</p>
//                     {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
//                     <p>
//                         {order.shipping_address.city}, {order.shipping_address.state}{' '}
//                         {order.shipping_address.postal_code}
//                     </p>
//                     <p>{order.shipping_address.country}</p>
//                     {order.shipping_address.phone && (
//                         <p className="mt-1 text-gray-600">Phone: {order.shipping_address.phone}</p>
//                     )}
//                 </div>
//             )}

//             <div className="mt-6 space-y-4">
//                 {order.items.map(item => (
//                     <div key={`${order._id}-${item.listing_id}-${item.sku}`} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded-lg p-4">
//                         <div>
//                             <p className="font-semibold text-gray-800">{item.title}</p>
//                             <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
//                         </div>
//                         <div className="text-sm text-gray-600 flex items-center gap-4">
//                             <span>Qty: <strong>{item.quantity}</strong></span>
//                             <span>Price: <strong>₹{item.price}</strong></span>
//                             <span>Subtotal: <strong>₹{item.subtotal}</strong></span>
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t pt-4">
//                 <p className="text-gray-500 text-sm">Currency: {order.currency || 'INR'}</p>
//                 <p className="text-2xl font-bold text-indigo-700">
//                     Total: ₹{totalAmount}
//                 </p>
//             </div>
//         </div>
//     );
// };

// const StatusPill = ({ label, color = 'gray' }) => {
//     const palette = {
//         gray: 'bg-gray-100 text-gray-700',
//         emerald: 'bg-emerald-100 text-emerald-700',
//         cyan: 'bg-cyan-100 text-cyan-700'
//     };
//     const classes = palette[color] || palette.gray;
//     return (
//         <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${classes}`}>
//             {label || 'pending'}
//         </span>
//     );
// };

// export default SellerOrders;


