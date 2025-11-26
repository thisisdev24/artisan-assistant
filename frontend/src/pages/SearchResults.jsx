// frontend/src/pages/SearchResults.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

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
      console.log(`[SearchResults] fetching /api/listings/search?query=${query}`);

      axios.get("http://localhost:5000/api/listings/search", {
        params: { query },
        timeout: 20000,
        signal: controller.signal, // modern axios supports AbortController
      })
        .then((resp) => {
          if (!mountedRef.current) return;
          // backend returns { results: [...] } per agreed contract
          const data = resp.data;
          const arr = data && data.results ? data.results : [];
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
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Search results for “{query}”</h1>
          <button onClick={handleBack} className="px-4 py-2 bg-gray-700 text-white rounded">Back</button>
        </div>

        {loading && <div className="text-gray-600">Loading results…</div>}
        {error && <div className="text-red-600">Error: {String(error)}</div>}

        {!loading && !error && results.length === 0 && (
          <div className="text-gray-600 mt-8">No results found.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {results.map((item) => (
            <div key={item._id || item.listing_id || item.faiss_id || JSON.stringify(item)} className="bg-white rounded shadow p-4">
              <img
                src={item.imageUrl || item.thumb}
                alt={item.title || "item"}
                className="w-full h-44 object-cover rounded mb-3"
                onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
              />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
              <div className="mt-2 font-bold text-indigo-600">₹{item.price ?? "—"}</div>
              {typeof item.score !== "undefined" && <div className="text-xs text-gray-500 mt-1">score: {item.score.toFixed(3)}</div>}
                            <button
                onClick={() => navigate(`/product/${item._id || item.listing_id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
              >
                View
              </button>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
