import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../utils/apiClient";

/**
 * ShowListing
 * Props:
 *  - storeName (optional) => if provided, used directly
 *
 * Sources for effective store name (priority):
 *  1. prop storeName
 *  2. navigation state (location.state.storeName)
 *  3. query param ?store=...
 *  4. localStorage.getItem('store')
 */
const ShowListing = ({ storeName: propStoreName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Refs for cancellation and mounted check
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const sellerStore = user?.store || null;
  const sellerId = user?.id || null;

  const effectiveStore = useMemo(() => {
    const fromState = location?.state?.storeName;
    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("store");
    const fromLocal = typeof window !== "undefined" ? localStorage.getItem("store") : null;
    return propStoreName || fromState || fromQuery || sellerStore || fromLocal || "";
  }, [propStoreName, location, sellerStore]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setErrorMsg(null);
      const hasStoreOrId = effectiveStore || sellerId;
      if (!hasStoreOrId) {
        setProducts([]);
        setErrorMsg("Store name not available.");
        setLoading(false);
        return;
      }

      // cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = {
          limit: 30,
        };
        if (effectiveStore) params.store = effectiveStore;
        if (sellerId) params.artisanId = sellerId;

        const resp = await apiClient.get('/api/listings/retrieve', {
          params,
          signal: controller.signal,
          timeout: 20000,
        });

        if (!mountedRef.current) return;

        // backend may return either an array or { results: [...], total, page }
        const data = resp.data;
        const items = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
        setProducts(items);
      } catch (err) {
        if (!mountedRef.current) return;
        if (axios.isCancel && axios.isCancel(err)) {
          // request cancelled, ignore
          return;
        }
        console.error("Error fetching products:", err);
        setErrorMsg(err?.response?.data?.message || err.message || "Failed to load products");
        setProducts([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [effectiveStore, sellerId]);

  const handleBack = () => navigate("/Seller");

  const pickImageSrc = (product) => {
    if (!product) return "/placeholder.jpg";
    if (product.imageUrl) return product.imageUrl;
    if (Array.isArray(product.images) && product.images.length > 0) {
      const img = product.images[0];
      return img?.thumbnailUrl || img?.thumb || img?.url || img?.large || img?.hi_res || "/placeholder.jpg";
    }
    return "/placeholder.jpg";
  };

  const shortDescription = (product) => {
    const d = product?.description;
    if (!d) return "";
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length > 0) return d[0];
    return "";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600">
        Loading your products...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-red-600 mb-4">Error: {errorMsg}</p>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-4 py-2 rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Listed Products</h1>
          <button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-semibold transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>

        {products.length === 0 ? (
          <div className="text-center text-gray-600 mt-20">
            <p className="text-lg">You haven’t listed any products yet.</p>
            <button
              onClick={() => navigate("/CreateListing")}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
              >
                <img
                  src={pickImageSrc(product)}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
                />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {product.title}
                </h2>
                <p className="text-gray-600 mb-2">{shortDescription(product)}</p>
                <p className="text-lg font-bold text-indigo-700 mb-4">
                  ₹{product.price ?? "—"}
                </p>

                <div className="flex justify-between">
                  <button
                    onClick={() => navigate(`/seller/edit-product/${product._id}`)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/product/${product._id}`)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowListing;
