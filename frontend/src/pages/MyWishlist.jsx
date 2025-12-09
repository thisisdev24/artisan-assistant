import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import { useCart } from '../context/CartContext';

const MyWishlist = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isBuyer } = useAuth();
    const { addToCart } = useCart();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !isBuyer) {
            navigate('/login');
            return;
        }
        fetchWishlist();
    }, [isAuthenticated, isBuyer, navigate]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/wishlist');
            setItems(res.data || []);
        } catch (err) {
            console.error('Failed to fetch wishlist', err);
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (listingId) => {
        try {
            await apiClient.post('/api/wishlist/remove', { listingId });
            setItems(prev => prev.filter(item => item._id !== listingId));
        } catch (err) {
            console.error('Failed to remove item', err);
            alert('Failed to remove item from wishlist');
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your wishlist...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Wishlist</h1>
                        <p className="text-gray-600">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Continue Shopping
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                        <svg
                            className="mx-auto h-24 w-24 text-gray-400 mb-4"
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
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
                        <p className="text-gray-500 mb-6">Start adding items you love!</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map(item => (
                            <div
                                key={item._id}
                                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group relative"
                            >
                                {/* Image */}
                                <div
                                    className="relative h-64 bg-gray-100 cursor-pointer overflow-hidden"
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
                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(item._id);
                                        }}
                                        className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:scale-110 transform duration-200"
                                        title="Remove from wishlist"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {/* Rating badge */}
                                    {item.average_rating > 0 && (
                                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span>{item.average_rating.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3
                                        className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={() => navigate(`/product/${item._id}`)}
                                    >
                                        {item.title}
                                    </h3>
                                    {item.description && (
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                                    )}
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-2xl font-bold text-indigo-600">₹{Math.round(item.price)?.toLocaleString() || '0'}</p>
                                            {item.store && (
                                                <p className="text-xs text-gray-500 mt-1">by {item.store}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/product/${item._id}`)}
                                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleAddToCart(item)}
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                                        >
                                            Add to Cart
                                        </button>
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

export default MyWishlist;

