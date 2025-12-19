import { useNavigate, Navigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const formatCurrency = (value) =>
  typeof value === "number"
    ? value.toLocaleString("en-IN", { style: "currency", currency: "INR" })
    : value;

const CartPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeFromCart, clearCart, loading } = useCart();
  const { isAuthenticated, isBuyer, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated or not a buyer
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isBuyer) {
    return <Navigate to="/login" replace />;
  }

  const handleCheckout = () => {
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Browse products and add them to your cart to continue.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.listing_id?._id || item.listing_id} className="flex gap-4 border rounded-xl p-4">
                <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                      {item.seller && (
                        <p className="text-sm text-gray-500 mt-1">
                          Seller: {typeof item.seller === "object" ? item.seller.name : item.seller}
                        </p>
                      )}
                      {item.stock !== null && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-indigo-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <p className="text-sm text-gray-400">{formatCurrency(item.price)} each</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center rounded border divide-x overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.listing_id?._id || item.listing_id, item.quantity - 1)}
                        className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        −
                      </button>
                      <div className="px-4 py-2 bg-white text-sm font-medium">{item.quantity}</div>
                      <button
                        onClick={() => updateQuantity(item.listing_id?._id || item.listing_id, item.quantity + 1)}
                        className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.listing_id?._id || item.listing_id)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 h-fit">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency((Math.floor(subtotal * 80)))}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-indigo-600">{formatCurrency(subtotal)}</span>
          </div>
          <button
            onClick={handleCheckout}
            className="mt-6 w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            Proceed to Checkout
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

