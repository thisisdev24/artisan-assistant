import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600">
          This is a placeholder checkout screen. Integrate your payment gateway or order creation flow here.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left">
          <p className="text-sm text-gray-500">Items</p>
          <p className="text-lg font-semibold text-gray-900">{items.length}</p>
          <p className="text-sm text-gray-500 mt-3">Subtotal</p>
          <p className="text-2xl font-bold text-indigo-600">
            {subtotal.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
          </p>
        </div>
        <button
          onClick={() => alert("Checkout integration pending")}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
        >
          Complete Order
        </button>
        <button
          onClick={() => navigate("/cart")}
          className="w-full py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
};

export default Checkout;

