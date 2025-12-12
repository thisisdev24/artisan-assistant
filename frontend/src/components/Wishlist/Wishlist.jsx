import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import { useCart } from '../../context/CartContext';

const Wishlist = ({ onUpdate }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/wishlist');
            setItems(res.data || []);
            if (onUpdate) onUpdate(res.data?.length || 0);
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

    const handleAddToCart = async (product) => {
        try {
            await addToCart(product, 1);
            alert('Added to cart!');
        } catch (err) {
            console.error('Failed to add to cart', err);
            alert('Failed to add to cart');
        }
    };

    const getImageUrl = (item) => {
        if (item.images && item.images.length > 0) {
            return item.images[0].large || item.images[0].thumb || item.images[0].hi_res;
        }
        return '/placeholder.svg';
    };

    if (loading) return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading wishlist...</p>
        </div>
    );

    if (items.length === 0) {
        return (
            <div className="text-center py-10">
                <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
                <p className="text-gray-500 text-lg mb-4">Your wishlist is empty.</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-indigo-600 hover:underline font-medium"
                >
                    Browse Products
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
                <div key={item._id} className="border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 relative group">
                    <div
                        className="aspect-square bg-gray-100 relative cursor-pointer"
                        onClick={() => navigate(`/product/${item._id}`)}
                    >
                        <img
                            src={getImageUrl(item)}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.target.src = '/placeholder.svg';
                            }}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(item._id);
                            }}
                            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                            title="Remove from wishlist"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <h3
                            className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => navigate(`/product/${item._id}`)}
                        >
                            {item.title}
                        </h3>
                        <p className="text-2xl font-bold text-indigo-600 mb-3">₹{Math.round(item.price?.toLocaleString()) || '0'}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/product/${item._id}`)}
                                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                View
                            </button>
                            <button
                                onClick={() => handleAddToCart(item)}
                                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Wishlist;
