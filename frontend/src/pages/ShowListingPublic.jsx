import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient"; // Use apiClient for auth requests

const LIMIT = 32;

const ShowListingPublic = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const navigate = useNavigate();

  const fetchProducts = async (pageNum = 1) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = `http://localhost:5000/api/listings/retrieve?page=${pageNum}&limit=${LIMIT}`;
      const response = await axios.get(url);
      // backend returns { results, total, page, limit }
      const data = response.data;
      const results = data.results || data; // be tolerant of older format
      const tot = data.total !== undefined ? data.total : (Array.isArray(results) ? results.length : 0);

      setProducts(results);
      setTotal(tot);
      setPage(data.page || pageNum);
    } catch (error) {
      console.error("Error fetching products:", error);
      setErrorMsg(error?.response?.data?.message || error.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await apiClient.get("/api/wishlist");
      const ids = new Set(res.data.map(item => item._id));
      setWishlistIds(ids);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
    }
  };

  const toggleWishlist = async (e, product) => {
    e.stopPropagation(); // Prevent card click
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to use wishlist");
      return;
    }

    const isInWishlist = wishlistIds.has(product._id);
    try {
      if (isInWishlist) {
        await apiClient.post("/api/wishlist/remove", { listingId: product._id });
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(product._id);
          return next;
        });
      } else {
        await apiClient.post("/api/wishlist/add", { listingId: product._id });
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.add(product._id);
          return next;
        });
      }
    } catch (err) {
      console.error("Wishlist toggle error", err);
      alert("Failed to update wishlist");
    }
  };

  const handleBack = () => navigate("/");

  const goToPage = (p) => {
    if (p < 1) return;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT || 1));
    if (p > totalPages) return;
    fetchProducts(p);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT || 1));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600">
        Loading products...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">All Products</h1>
          <button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-semibold transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>

        {errorMsg ? (
          <div className="text-center text-red-600 mb-6">
            <p>{errorMsg}</p>
            <button onClick={() => fetchProducts(page)} className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded">Retry</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-600 mt-20">
            <p className="text-lg">No products yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col relative"
                >
                  <img
                    src={
                      product.imageUrl ||
                      (product.images && product.images[0] && (product.images[0].thumb || product.images[0].large))
                    }
                    alt={product.title}
                    className="w-full h-56 object-cover rounded-lg mb-4"
                  />

                  {/* Wishlist Heart Icon */}
                  <button
                    onClick={(e) => toggleWishlist(e, product)}
                    className="absolute top-4 right-4 p-2 bg-white/80 rounded-full shadow-sm hover:bg-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-6 w-6 ${wishlistIds.has(product._id) ? "text-red-500 fill-current" : "text-gray-400"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>

                  <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                    {product.title}
                  </h2>

                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {typeof product.description === "string"
                      ? product.description.length > 160
                        ? product.description.slice(0, 157) + "..."
                        : product.description
                      : Array.isArray(product.description) && product.description.length > 0
                        ? product.description[0]
                        : ""}
                  </p>

                  <div className="flex items-center text-yellow-500 text-sm mb-3">
                    ⭐ {product.average_rating || 0} ({product.rating_number || 0} ratings)
                  </div>

                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-indigo-600 font-bold text-lg">
                      ₹{product.price}
                    </span>
                    <button
                      onClick={() => navigate(`/products/${product._id}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className={`px-4 py-2 rounded bg-white border ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                ◀ Prev
              </button>

              <div className="px-4 py-2 rounded bg-white border">
                Page <strong className="mx-2">{page}</strong> of <strong>{totalPages}</strong>
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className={`px-4 py-2 rounded bg-white border ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                Next ▶
              </button>
            </div>

            {/* Optional: smaller page selector */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              {totalPages <= 20 ? (
                // show small page list when pages are small
                Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-2 py-1 rounded ${p === page ? 'bg-indigo-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))
              ) : (
                <div>Showing page {page} — use Next / Prev to navigate</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShowListingPublic;
