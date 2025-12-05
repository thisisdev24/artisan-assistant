import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { isBuyer } = useAuth();

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: true,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [upiId, setUpiId] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isBuyer) {
      navigate("/login");
      return;
    }
    fetchAddresses();
  }, [isBuyer, navigate]);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await apiClient.get("/api/addresses");
      setAddresses(res.data || []);
      const defaultAddr = res.data?.find((a) => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr._id);
    } catch (err) {
      console.error("Failed to load addresses", err);
      setError(err?.response?.data?.msg || "Failed to load saved addresses.");
    } finally {
      setLoadingAddresses(false);
    }
  };

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  const handleAddressInputChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setError("");
    try {
      const res = await apiClient.post("/api/addresses", addressForm);
      await fetchAddresses();
      setSelectedAddressId(res.data._id);
    } catch (err) {
      console.error("Failed to save address", err);
      setError(err?.response?.data?.msg || "Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const ensureAddressSelected = () => {
    if (selectedAddressId) return true;
    if (
      addressForm.name &&
      addressForm.phone &&
      addressForm.line1 &&
      addressForm.city &&
      addressForm.state &&
      addressForm.postal_code
    ) {
      return true;
    }
    setError("Please select an address or fill in the address form.");
    return false;
  };

  const handleNextFromAddress = async () => {
    if (!hasItems) {
      setError("Your cart is empty.");
      return;
    }
    if (!ensureAddressSelected()) return;
    setStep(2);
    setError("");
  };

  const handlePlaceOrder = async () => {
    if (!hasItems) {
      setError("Your cart is empty.");
      return;
    }
    if (paymentMethod === "upi" && !upiId.trim()) {
      setError("Please enter your UPI ID.");
      return;
    }

    setPlacingOrder(true);
    setError("");
    try {
      const payload = {
        paymentMethod,
        upiId: paymentMethod === "upi" ? upiId.trim() : undefined,
      };

      if (selectedAddressId) {
        payload.addressId = selectedAddressId;
      } else {
        payload.addressInput = addressForm;
      }

      const res = await apiClient.post("/api/orders/checkout", payload);
      clearCart();
      const orderId = res.data?.order?._id;
      alert("Order placed successfully!");
      if (orderId) {
        navigate("/profile?tab=orders");
      } else {
        navigate("/profile?tab=orders");
      }
    } catch (err) {
      console.error("Checkout failed", err);
      setError(err?.response?.data?.msg || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!hasItems) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            <button
              onClick={() => navigate("/cart")}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              ← Back to Cart
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-4 mb-8">
            <StepIndicator step={1} current={step} label="Address" />
            <div className="flex-1 h-px bg-gray-200" />
            <StepIndicator step={2} current={step} label="Payment" />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Shipping Address</h2>
              {loadingAddresses ? (
                <div className="text-gray-500 text-sm">Loading saved addresses...</div>
              ) : addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition ${selectedAddressId === addr._id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-200"
                        }`}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        checked={selectedAddressId === addr._id}
                        onChange={() => setSelectedAddressId(addr._id)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{addr.name}</p>
                          {addr.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{addr.phone}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ""}
                        </p>
                        <p className="text-sm text-gray-600">
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        <p className="text-sm text-gray-600">{addr.country}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  You don&apos;t have any saved addresses yet. Add one below.
                </p>
              )}

              {/* New address form */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">
                  Add / Edit Address
                </h3>
                <form onSubmit={handleSaveAddress} className="grid gap-3 md:grid-cols-2">
                  <InputField
                    label="Full Name"
                    value={addressForm.name}
                    onChange={(e) => handleAddressInputChange("name", e.target.value)}
                    required
                  />
                  <InputField
                    label="Phone"
                    value={addressForm.phone}
                    onChange={(e) => handleAddressInputChange("phone", e.target.value)}
                    required
                  />
                  <InputField
                    label="Address Line 1"
                    value={addressForm.line1}
                    onChange={(e) => handleAddressInputChange("line1", e.target.value)}
                    required
                    full
                  />
                  <InputField
                    label="Address Line 2 (optional)"
                    value={addressForm.line2}
                    onChange={(e) => handleAddressInputChange("line2", e.target.value)}
                    full
                  />
                  <InputField
                    label="City"
                    value={addressForm.city}
                    onChange={(e) => handleAddressInputChange("city", e.target.value)}
                    required
                  />
                  <InputField
                    label="State"
                    value={addressForm.state}
                    onChange={(e) => handleAddressInputChange("state", e.target.value)}
                    required
                  />
                  <InputField
                    label="Postal Code"
                    value={addressForm.postal_code}
                    onChange={(e) => handleAddressInputChange("postal_code", e.target.value)}
                    required
                  />
                  <InputField
                    label="Country"
                    value={addressForm.country}
                    onChange={(e) => handleAddressInputChange("country", e.target.value)}
                  />
                  <div className="col-span-2 flex items-center gap-2 mt-2">
                    <input
                      id="makeDefault"
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) =>
                        handleAddressInputChange("is_default", e.target.checked)
                      }
                    />
                    <label htmlFor="makeDefault" className="text-sm text-gray-700">
                      Make this my default address
                    </label>
                  </div>
                  <div className="col-span-2 flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNextFromAddress}
                  className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Payment</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:border-indigo-500">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">
                      Pay with cash when the order is delivered to your address.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 opacity-60 cursor-not-allowed">
                  <input
                    type="radio"
                    name="payment"
                    disabled
                  />
                  <div>
                    <p className="font-semibold text-gray-900">UPI</p>
                    <p className="text-sm text-gray-500">
                      Pay instantly using your UPI app (e.g., Google Pay, PhonePe, Paytm). (Coming soon)
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 opacity-60 cursor-not-allowed">
                  <input
                    type="radio"
                    name="payment"
                    disabled
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Credit / Debit Card</p>
                    <p className="text-sm text-gray-500">
                      Pay securely with your card. (Coming soon)
                    </p>
                  </div>
                </label>
              </div>

              {paymentMethod === "upi" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="example@upi"
                    className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We will simulate a successful UPI payment for this demo checkout.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                >
                  ← Back to Address
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                >
                  {placingOrder ? "Placing Order..." : "Place Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow p-6 h-fit">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Items</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                {(Math.floor(subtotal * 80)).toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>Included</span>
            </div>
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-indigo-600">
              {(Math.floor(subtotal * 80)).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ step, current, label }) => {
  const isActive = step === current;
  const isCompleted = current > step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isActive
          ? "bg-indigo-600 text-white"
          : isCompleted
            ? "bg-green-500 text-white"
            : "bg-gray-200 text-gray-600"
          }`}
      >
        {step}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

const InputField = ({ label, value, onChange, required, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  </div>
);

export default Checkout;

