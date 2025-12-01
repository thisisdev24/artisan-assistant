import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useCart } from '../context/CartContext';

const RecentlyViewed = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = () => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(parsed);
      }
    } catch (err) {
      console.error('Failed to load recently viewed', err);
    } finally {
      setLoading(false);
    }
  };

  const clearRecentlyViewed = () => {
    if (window.confirm('Clear all recently viewed items?')) {
      localStorage.removeItem('recentlyViewed');
      setItems([]);
    }
  };

  const removeItem = (itemId) => {
    const updated = items.filter(item => item._id !== itemId);
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    setItems(updated);
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      alert('Added to cart!');
    } catch (err) {
      console.error('Failed to add to cart', err);
      if (err.response?.status === 401) {
        alert('Please login to add items to cart');
        navigate('/login');
      } else {
        alert('Failed to add to cart');
      }
    }
  };

  const getImageUrl = (item) => {
    if (item.imageUrl) return item.imageUrl;
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Recently Viewed</h1>
            <p className="text-gray-600">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
          <div className="flex gap-3">
            {items.length > 0 && (
              <button
                onClick={clearRecentlyViewed}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No recently viewed items</h2>
            <p className="text-gray-500 mb-6">Products you view will appear here</p>
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
                      removeItem(item._id);
                    }}
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-red-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:scale-110 transform duration-200"
                    title="Remove from recently viewed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {/* Viewed time badge */}
                  {item.viewedAt && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-gray-600">
                      {new Date(item.viewedAt).toLocaleDateString()}
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
                      <p className="text-2xl font-bold text-indigo-600">₹{item.price?.toLocaleString() || '0'}</p>
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

export default RecentlyViewed;

