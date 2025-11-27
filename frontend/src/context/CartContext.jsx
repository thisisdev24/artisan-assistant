import { createContext, useContext, useEffect, useReducer } from 'react';

const CartContext = createContext(null);

const initialState = {
  items: []
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, quantity } = action.payload;
      const existing = state.items.find((it) => it._id === item._id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((it) =>
            it._id === item._id
              ? { ...it, quantity: Math.min(99, it.quantity + quantity) }
              : it
          )
        };
      }
      return {
        ...state,
        items: [...state.items, { ...item, quantity: Math.min(99, quantity) }]
      };
    }
    case 'UPDATE_QTY': {
      const { id, quantity } = action.payload;
      return {
        ...state,
        items: state.items
          .map((it) =>
            it._id === id ? { ...it, quantity: Math.max(1, Math.min(99, quantity)) } : it
          )
          .filter((it) => it.quantity > 0)
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((it) => it._id !== action.payload) };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

const hydrateState = () => {
  if (typeof window === 'undefined') return initialState;
  try {
    const stored = window.localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : initialState;
  } catch {
    return initialState;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, hydrateState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cart', JSON.stringify(state));
    }
  }, [state]);

  const addToCart = (product, quantity = 1) => {
    if (!product?._id) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        item: {
          _id: product._id,
          title: product.title,
          price: product.price,
          image:
            product.imageUrl ||
            (product.images && product.images.length > 0 && (product.images[0].large || product.images[0].thumb)) ||
            '',
          seller: product.seller || null,
          stock: product.stock ?? null
        },
        quantity
      }
    });
  };

  const updateQuantity = (id, quantity) => {
    dispatch({ type: 'UPDATE_QTY', payload: { id, quantity } });
  };

  const removeFromCart = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id });

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const cartCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        cartCount,
        subtotal,
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

