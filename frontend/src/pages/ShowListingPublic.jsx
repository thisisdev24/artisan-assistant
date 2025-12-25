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
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

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
  const [loaded, setLoaded] = useState(false);
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
    setLoaded(true);
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const heroVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
  };

  const illustrationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1, delay: 0.3 } },
  };

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
          "http://localhost:5000/api/listings/retrieve?status=published&deleteRequested=false",
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
      <motion.div className="flex justify-center items-center h-screen text-xl text-gray-600 font-medium">
        Loading products...
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl md:max-w-7xl mx-auto px-8 py-24">
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-12 select-none"
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <motion.div>
            <motion.h1
              className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight"
              variants={itemVariants}
            >
              All Products
            </motion.h1>
            <motion.p
              className="text-gray-700 text-sm sm:text-base mt-1"
              variants={itemVariants}
            >
              Browse curated crafts and refine with filters in real time.
            </motion.p>
          </motion.div>
          <motion.div
            className="flex items-center gap-4 relative"
            variants={itemVariants}
          >
            {/* NEW: Filter Dropdown motion.button */}
            <motion.div
              className="relative"
              ref={filterRef}
              variants={illustrationVariants}
            >
              <motion.button
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
              </motion.button>

              {/* NEW: Filter Dropdown Content */}
              {isFilterOpen && (
                <motion.div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 animate-fade-in-down">
                  <motion.div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Refine Results
                    </h3>
                    <motion.button
                      onClick={resetFilters}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline"
                      disabled={!filterIsActive}
                    >
                      Reset All
                    </motion.button>
                  </motion.div>

                  <motion.div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Category */}
                    <motion.div>
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
                    </motion.div>

                    {/* Price - NEW: Uses priceInputs and handlePriceKeyDown */}
                    <motion.div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Price Range (₹)
                      </label>
                      <motion.div className="flex items-center gap-2">
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
                      </motion.div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Press Enter to apply
                      </p>
                    </motion.div>

                    {/* Material */}
                    <motion.div>
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
                    </motion.div>

                    {/* Colour */}
                    <motion.div>
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
                    </motion.div>

                    {/* Availability */}
                    <motion.div>
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
                    </motion.div>

                    {/* Ratings */}
                    <motion.div className="grid grid-cols-2 gap-2">
                      <motion.div>
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
                      </motion.div>
                      <motion.div>
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
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>

            {/* Sort By (Existing) */}
            <motion.div className="relative">
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
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 
            NEW LAYOUT (FULL WIDTH MAIN + DROPDOWN FILTERS ABOVE)
        */}
        <motion.div
          className="w-full select-none"
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {errorMsg ? (
            <motion.div className="text-center text-red-600 mb-6">
              <p className="text-lg font-medium">{errorMsg}</p>
              <motion.button
                onClick={() => fetchProducts({ pageNum: page })}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
              >
                Retry
              </motion.button>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div className="text-center text-gray-600 mt-10 sm:mt-16">
              <p className="text-xl font-medium">
                No products match these filters.
              </p>
              <motion.button
                onClick={resetFilters}
                className="mt-4 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                Clear filters
              </motion.button>
            </motion.div>
          ) : (
            <>
              <motion.div
                className="flex justify-between items-center mb-4 text-sm text-gray-600"
                initial="hidden"
                animate={loaded ? "visible" : "hidden"}
                variants={containerVariants}
              >
                <span>
                  Showing {products.length} of {total} items
                </span>
                {filterIsActive && (
                  <span className="text-indigo-600 font-medium">
                    Filters applied
                  </span>
                )}
              </motion.div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12"
                variants={heroVariants}
              >
                {products.map((product) => (
                  <motion.div
                    key={product._id}
                    onClick={() => navigate(`/products/${product._id}`)}
                    className="bg-transparent rounded-xl hover:shadow-xl hover:border-2 hover:bg-indigo-200 transition-all duration-100 flex flex-col relative cursor-pointer hover:-translate-y-1"
                    variants={illustrationVariants}
                    whileHover={{ scale: 1.02 }}
                  >
                    <img
                      src={
                        product.imageUrl ||
                        (product.images &&
                          product.images[0] &&
                          product.images[0].large)
                      }
                      alt={product.title}
                      loading="lazy"
                      className="w-full aspect-square object-contain rounded-xl mx-auto hover:shadow-lg hover:border-2 duration-100"
                    />

                    <motion.button
                      onClick={(e) => toggleWishlist(e, product)}
                      className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
                      variants={illustrationVariants}
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
                    </motion.button>

                    <motion.div className="px-4 mt-4" variants={heroVariants}>
                      <motion.h2
                        className="text-lg font-bold text-gray-900 mb-1 capitalize truncate"
                        variants={itemVariants}
                      >
                        {product.title}
                      </motion.h2>

                      <div className="flex justify-start items-center text-gray-700 text-sm lg:text-base">
                        ⭐{" "}
                        <span className="font-semibold ml-1">
                          {product.average_rating || 0}
                        </span>
                        <span className="ml-2">
                          ({product.rating_number || 0} reviews)
                        </span>
                      </div>
                    </motion.div>

                    <div className="flex justify-between items-center px-4 py-2">
                      <span className="text-red-700 font-semibold text-md lg:text-xl">
                        {"₹" + Math.round(product.price)}
                      </span>
                      <span className="text-xs lg:text-sm px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                        {product.main_category || "Handcrafted"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {loading && products.length > 0 && (
                <motion.div className="text-center mt-8">
                  <motion.div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></motion.div>
                  <p className="text-gray-600 mt-2">Loading more products...</p>
                </motion.div>
              )}

              {!hasMore && products.length > 0 && (
                <motion.div className="text-center mt-8 text-gray-600 font-medium">
                  You've reached the end of the list.
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ShowListingPublic;
