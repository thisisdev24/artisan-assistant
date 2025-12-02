/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isBuyer } = useAuth();

  // Load cart from backend when user is authenticated
  useEffect(() => {
    const loadCart = async () => {
      if (!isAuthenticated || !isBuyer) {
        setItems([]);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get('/api/cart');
        setItems(response.data.items || []);
      } catch (err) {
        console.error('Failed to load cart:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, isBuyer]);

  const addToCart = async (product, quantity = 1) => {
    if (!isAuthenticated || !isBuyer) {
      // Redirect to login will be handled by the component
      return;
    }

    if (!product?._id) return;

    try {
      const response = await apiClient.post('/api/cart/add', {
        listing_id: product._id,
        quantity
      });
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      throw err;
    }
  };

  const updateQuantity = async (listingId, quantity) => {
    if (!isAuthenticated || !isBuyer) return;

    try {
      const response = await apiClient.put(`/api/cart/update/${listingId}`, {
        quantity: Math.max(1, Math.min(99, quantity))
      });
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Failed to update quantity:', err);
      throw err;
    }
  };

  const removeFromCart = async (listingId) => {
    if (!isAuthenticated || !isBuyer) return;

    try {
      const response = await apiClient.delete(`/api/cart/remove/${listingId}`);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Failed to remove from cart:', err);
      throw err;
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated || !isBuyer) return;

    try {
      await apiClient.delete('/api/cart/clear');
      setItems([]);
    } catch (err) {
      console.error('Failed to clear cart:', err);
      throw err;
    }
  };

  const cartCount = isAuthenticated && isBuyer ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const subtotal = isAuthenticated && isBuyer ? items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};

