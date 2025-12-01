import React, { useEffect, useState } from 'react';
import apiClient from '../../utils/apiClient';

const Wishlist = ({ count, onUpdate }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/wishlist');
            setItems(res.data);
        } catch (err) {
            console.error("Failed to fetch wishlist", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (listingId) => {
        try {
            const res = await apiClient.post('/api/wishlist/remove', { listingId });
            setItems(prev => prev.filter(item => item._id !== listingId));
            if (onUpdate) onUpdate(res.data.count); // Update parent count
        } catch (err) {
            console.error("Failed to remove item", err);
            alert("Failed to remove item");
        }
    };

    if (loading) return <div className="text-center py-10">Loading wishlist...</div>;

    if (items.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500 text-lg mb-4">Your wishlist is empty.</p>
                <button className="text-primary hover:underline font-medium">Browse Products</button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
                <div key={item._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="aspect-square bg-gray-100 relative">
                        {item.images && item.images[0] ? (
                            <img
                                src={item.images[0].thumb || item.images[0].large}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                        )}
                        <button
                            onClick={() => handleRemove(item._id)}
                            className="absolute top-2 right-2 bg-white/90 text-red-500 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                            title="Remove from wishlist"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <h3 className="font-medium text-gray-900 truncate mb-1">{item.title}</h3>
                        <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                        <button className="w-full mt-3 bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                            Add to Cart
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Wishlist;
