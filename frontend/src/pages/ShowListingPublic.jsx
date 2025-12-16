import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import apiClient from "../utils/apiClient"; // Use apiClient for auth requests

const LIMIT = 24;

const defaultFilters = {
  category: "",
  minPrice: "",
  maxPrice: "",
  material: "",
  color: "",
  origin: "",
  // craftStyle: "",
  availability: "",
  // sustainability: "",
  minRating: "",
  minReviews: "",
};

const categoryOptions = [
  "All",
  "Textiles",
  "Home Decor",
  "Jewelry",
  "Woodwork",
  "Ceramics",
  "Paintings",
  "Accessories",
];
const materialOptions = [
  "All",
  "Cotton",
  "Silk",
  "Wool",
  "Wood",
  "Metal",
  "Clay",
  "Glass",
  "Leather",
  "Bamboo",
];
const colorOptions = [
  "All",
  "Natural",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Brown",
  "Black",
  "White",
  "Multicolor",
];
// const craftOptions = ["All", "Handloom", "Block Print", "Embroidery", "Weaving", "Pottery", "Carving", "Painting", "Beadwork"];
// const originOptions = ["All", "India", "Rajasthan", "Gujarat", "Odisha", "Uttar Pradesh", "Karnataka", "Kerala", "West Bengal"];

const ShowListingPublic = () => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [hasMore, setHasMore] = useState(true);

  // Main filters state (updates to this trigger API calls)
  const [filters, setFilters] = useState(defaultFilters);

  // NEW: Local state for price inputs so they don't trigger API on every keystroke
  const [priceInputs, setPriceInputs] = useState({ min: "", max: "" });

  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // NEW: Ref to detect clicks outside the filter dropdown
  const filterRef = useRef(null);

  const navigate = useNavigate();

  // NEW: Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buildParams = useCallback(
    (pageNum = 1) => {
      const params = {
        page: pageNum,
        limit: LIMIT,
        sortBy,
      };

      if (filters.category && filters.category !== "All")
        params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.material && filters.material !== "All")
        params.material = filters.material;
      if (filters.color && filters.color !== "All")
        params.color = filters.color;
      // if (filters.origin && filters.origin !== "All") params.origin = filters.origin;
      // if (filters.craftStyle && filters.craftStyle !== "All") params.craftStyle = filters.craftStyle;
      if (filters.availability) params.availability = filters.availability;
      // if (filters.sustainability) params.sustainability = filters.sustainability;
      if (filters.minRating) params.minRating = filters.minRating;
      if (filters.minReviews) params.minReviews = filters.minReviews;

      return params;
    },
    [filters, sortBy]
  );

  const fetchProducts = useCallback(
    async ({ pageNum = 1, append = false } = {}) => {
      if (!append) {
        setLoading(true);
        setProducts([]);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);
      try {
        const response = await axios.get(
          "http://localhost:5000/api/listings/retrieve",
          {
            params: buildParams(pageNum),
          }
        );

        const data = response.data;
        const results = data.results || data;
        const tot =
          data.total !== undefined
            ? data.total
            : Array.isArray(results)
            ? results.length
            : 0;

        setProducts((prev) => (append ? [...prev, ...results] : results));
        setTotal(tot);
        setPage(data.page || pageNum);
        setHasMore(results.length === LIMIT && pageNum * LIMIT < tot);
      } catch (error) {
        console.error("Error fetching products:", error);
        setErrorMsg(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load products"
        );
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchWishlist();
  }, []);

  useEffect(() => {
    fetchProducts({ pageNum: 1, append: false });
  }, [fetchProducts]);

  // NEW: Sync local price inputs when filters are reset
  useEffect(() => {
    if (filters.minPrice === "" && filters.maxPrice === "") {
      setPriceInputs({ min: "", max: "" });
    }
  }, [filters.minPrice, filters.maxPrice]);

  const fetchWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await apiClient.get("/api/wishlist");
      const ids = new Set(res.data.map((item) => item._id));
      setWishlistIds(ids);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
    }
  };

  const toggleWishlist = async (e, product) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to use wishlist");
      return;
    }

    const isInWishlist = wishlistIds.has(product._id);
    try {
      if (isInWishlist) {
        await apiClient.post("/api/wishlist/remove", {
          listingId: product._id,
        });
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(product._id);
          return next;
        });
      } else {
        await apiClient.post("/api/wishlist/add", { listingId: product._id });
        setWishlistIds((prev) => {
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // NEW: Handler for price typing (does not trigger fetch)
  const handlePriceInputChange = (e, type) => {
    setPriceInputs((prev) => ({ ...prev, [type]: e.target.value }));
  };

  // NEW: Handler for 'Enter' key on price inputs
  const handlePriceKeyDown = (e) => {
    if (e.key === "Enter") {
      setFilters((prev) => ({
        ...prev,
        minPrice: priceInputs.min,
        maxPrice: priceInputs.max,
      }));
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    // priceInputs will be reset via the useEffect above
  };

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchProducts({ pageNum: page + 1, append: true });
    }
  }, [fetchProducts, hasMore, loading, page]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  const filterIsActive = useMemo(
    () => Object.entries(filters).some(([value]) => value && value !== "All"),
    [filters]
  );

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600 font-medium">
        Loading products...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 py-6 sm:py-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 relative z-20">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              All Products
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              Browse curated crafts and refine with filters in real time.
            </p>
          </div>
          <div className="flex items-center gap-3 relative">
            {/* NEW: Filter Dropdown Button */}
            <div className="relative" ref={filterRef}>
              <button
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium shadow-sm transition-colors
                  ${
                    isFilterOpen
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>Filters</span>
                {filterIsActive && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                )}
              </button>

              {/* NEW: Filter Dropdown Content */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 animate-fade-in-down">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Refine Results
                    </h3>
                    <button
                      onClick={resetFilters}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline"
                      disabled={!filterIsActive}
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={filters.category || "All"}
                        onChange={(e) =>
                          handleFilterChange("category", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt} value={opt === "All" ? "" : opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price - NEW: Uses priceInputs and handlePriceKeyDown */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Price Range (₹)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={priceInputs.min}
                          onChange={(e) => handlePriceInputChange(e, "min")}
                          onKeyDown={handlePriceKeyDown}
                          placeholder="Min"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={priceInputs.max}
                          onChange={(e) => handlePriceInputChange(e, "max")}
                          onKeyDown={handlePriceKeyDown}
                          placeholder="Max"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Press Enter to apply
                      </p>
                    </div>

                    {/* Material */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Material
                      </label>
                      <select
                        value={filters.material || "All"}
                        onChange={(e) =>
                          handleFilterChange("material", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {materialOptions.map((opt) => (
                          <option key={opt} value={opt === "All" ? "" : opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Colour */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Colour
                      </label>
                      <select
                        value={filters.color || "All"}
                        onChange={(e) =>
                          handleFilterChange("color", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {colorOptions.map((opt) => (
                          <option key={opt} value={opt === "All" ? "" : opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Availability */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Availability
                      </label>
                      <select
                        value={filters.availability}
                        onChange={(e) =>
                          handleFilterChange("availability", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Any</option>
                        <option value="in_stock">In Stock</option>
                      </select>
                    </div>

                    {/* Ratings */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Min Rating
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={filters.minRating}
                          onChange={(e) =>
                            handleFilterChange("minRating", e.target.value)
                          }
                          placeholder="e.g. 4"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Min Reviews
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={filters.minReviews}
                          onChange={(e) =>
                            handleFilterChange("minReviews", e.target.value)
                          }
                          placeholder="e.g. 10"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sort By (Existing) */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none border border-gray-200 bg-white rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popularity">Popularity</option>
                <option value="rating_desc">Highest Rated</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* 
            NEW LAYOUT (FULL WIDTH MAIN + DROPDOWN FILTERS ABOVE)
        */}
        <div className="w-full">
          {errorMsg ? (
            <div className="text-center text-red-600 mb-6">
              <p className="text-lg font-medium">{errorMsg}</p>
              <button
                onClick={() => fetchProducts({ pageNum: page })}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-600 mt-10 sm:mt-16">
              <p className="text-xl font-medium">
                No products match these filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                <span>
                  Showing {products.length} of {total} items
                </span>
                {filterIsActive && (
                  <span className="text-indigo-600 font-medium">
                    Filters applied
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => navigate(`/products/${product._id}`)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-5 flex flex-col relative cursor-pointer border border-gray-200 hover:-translate-y-1"
                  >
                    <img
                      src={
                        product.imageUrl ||
                        (product.images &&
                          product.images[0] &&
                          (product.images[0].thumb || product.images[0].large))
                      }
                      alt={product.title}
                      loading="lazy"
                      className="w-full h-52 object-cover rounded-lg mb-4 bg-gray-50"
                    />

                    <button
                      onClick={(e) => toggleWishlist(e, product)}
                      className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
                      title={
                        wishlistIds.has(product._id)
                          ? "Remove from Wishlist"
                          : "Add to Wishlist"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-6 w-6 ${
                          wishlistIds.has(product._id)
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

                    <h2 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 leading-tight">
                      {product.title}
                    </h2>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                      {typeof product.description === "string"
                        ? product.description.length > 160
                          ? product.description.slice(0, 157) + "..."
                          : product.description
                        : Array.isArray(product.description) &&
                          product.description.length > 0
                        ? product.description[0]
                        : ""}
                    </p>

                    <div className="flex items-center text-yellow-500 text-sm mb-3">
                      ⭐{" "}
                      <span className="font-semibold ml-1">
                        {product.average_rating || 0}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({product.rating_number || 0} reviews)
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-indigo-600 font-bold text-2xl">
                        ₹{Math.round(product.price)}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                        {product.main_category || "Handcrafted"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {loading && products.length > 0 && (
                <div className="text-center mt-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-gray-600 mt-2">Loading more products...</p>
                </div>
              )}

              {!hasMore && products.length > 0 && (
                <div className="text-center mt-8 text-gray-600 font-medium">
                  You've reached the end of the list.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowListingPublic;
