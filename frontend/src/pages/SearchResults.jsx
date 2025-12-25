// frontend/src/pages/SearchResults.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "../utils/apiClient";

function useQueryString() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SearchResults = () => {
  const queryParams = useQueryString();
  const query = queryParams.get("query")?.trim() || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const navigate = useNavigate();

  // refs for cancellation and mounted state
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /*const fetchWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await apiClient.get("/api/wishlist");
      const ids = new Set(res.data.map(item => item._id));
      setWishlistIds(ids);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
    }
  };*/

  const toggleWishlist = async (e, item) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to use wishlist");
      return;
    }

    const itemId = item._id || item.listing_id || item.faiss_id;
    const isInWishlist = wishlistIds.has(itemId);

    try {
      if (isInWishlist) {
        await apiClient.post("/api/wishlist/remove", { listingId: itemId });
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        await apiClient.post("/api/wishlist/add", { listingId: itemId });
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
      }
    } catch (err) {
      console.error("Wishlist toggle error", err);
      alert("Failed to update wishlist");
    }
  };

  useEffect(() => {
    // run only when query changes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // if no query, clear results and stop
    if (!query) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // small debounce to avoid multiple rapid calls
    debounceRef.current = setTimeout(() => {
      // cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Debug log — helpful to see what's calling the API repeatedly
      // You can remove this when stable
      console.log(
        `[SearchResults] fetching /api/listings/search?query=${query}`
      );

      axios
        .get("http://localhost:5000/api/listings/search", {
          params: { query },
          timeout: 20000,
          signal: controller.signal, // modern axios supports AbortController
        })
        .then((resp) => {
          if (!mountedRef.current) return;
          // backend returns { results: [...] } per agreed contract
          const data = resp.data;
          const arr = data && data.results ? data.results : [];
          console.log(arr);
          setResults(arr);
        })
        .catch((err) => {
          if (!mountedRef.current) return;
          if (axios.isCancel(err)) {
            // request was cancelled — normal on new keystroke / navigation
            console.log("[SearchResults] request cancelled");
            return;
          }
          console.error("Search error", err);
          setError(err.message || "search_failed");
          setResults([]);
        })
        .finally(() => {
          if (!mountedRef.current) return;
          setLoading(false);
        });
    }, 300); // 300ms debounce

    // cleanup for this effect run
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // don't abort here — we abort when next request starts (above) or on unmount
    };
  }, [query]); // <-- important: effect depends only on `query`

  const handleBack = () => navigate("/");

  return (
    <div className="min-h-screen bg-white select-none">
      <div className="max-w-6xl md:max-w-7xl mx-auto px-8 py-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Search results for “{query}”</h1>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-700 text-white rounded"
          >
            Back
          </button>
        </div>

        {loading && <div className="text-gray-600">Loading results…</div>}
        {error && <div className="text-red-600">Error: {String(error)}</div>}

        {!loading && !error && results.length === 0 && (
          <div className="text-gray-600 mt-8">No results found.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {results.map((item) => (
            <button
              onClick={() =>
                navigate(`/products/${item._id || item.listing_id}`)
              }
              className="rounded-lg"
            >
              <div
                key={
                  item._id ||
                  item.listing_id ||
                  item.faiss_id ||
                  JSON.stringify(item)
                }
                className="flex flex-col rounded-xl hover:shadow-xl hover:border hover:bg-indigo-200 hover:border-indigo-200 relative duration-100"
              >
                <img
                  src={item.images[0].large || item.images[0].hi_res}
                  alt={item.title || "item"}
                  className="w-full aspect-square object-contain mx-auto bg-white rounded-xl hover:shadow-xl hover:border-2 hover:border-indigo-200 duration-100"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg";
                  }}
                />

                {/* Wishlist Heart Icon */}
                <button
                  onClick={(e) => toggleWishlist(e, item)}
                  className="absolute top-4 right-4 p-2 bg-white/80 rounded-full shadow-sm hover:bg-white transition-colors"
                  title={
                    wishlistIds.has(
                      item._id || item.listing_id || item.faiss_id
                    )
                      ? "Remove from Wishlist"
                      : "Add to Wishlist"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${
                      wishlistIds.has(
                        item._id || item.listing_id || item.faiss_id
                      )
                        ? "text-red-500 fill-current"
                        : "text-gray-400"
                    }`}
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

                <div className="px-4 mt-4 shadow-lg">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 capitalize truncate">
                    {item.title}
                  </h2>
                  <div className="flex justify-start items-center text-gray-700 text-sm lg:text-base mb-2">
                    ⭐{" "}
                    <span className="font-semibold ml-1">
                      {item.average_rating || 0}
                    </span>
                    <span className="ml-2">
                      ({item.rating_number || 0} reviews)
                    </span>
                  </div>
                  <div className="flex justify-start items-center gap-4 text-red-500 text-md lg:text-lg font-bold mb-2">
                    ₹{Math.round(item.price) ?? "—"}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
