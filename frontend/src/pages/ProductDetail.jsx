import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * ProductDetail.jsx
 * Modern Tailwind UI (JSX only). No external UI imports required.
 */

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const response = await axios.get(`http://localhost:5000/api/listings/${id}`);
        const data = response.data;
        setProduct(data);

        const initialImage =
          data.imageUrl ||
          (data.images && data.images[0] && (data.images[0].large || data.images[0].thumb));
        setSelectedImage(initialImage || "");
      } catch (err) {
        console.error(err);
        setErrorMsg(err?.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  // Helpers
  const allImages = () => {
    const images = [];
    if (!product) return images;
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img.large && !images.includes(img.large)) images.push(img.large);
        if (img.thumb && !images.includes(img.thumb)) images.push(img.thumb);
      });
    }
    return images;
  };

  const currency = (v) =>
    typeof v === "number" ? v.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : v;

  const handleAddToCart = async () => {
    if (!product) return;
    if (product.stock === 0) return alert("Product out of stock");
    setAdding(true);
    try {
      // TODO: wire to your backend cart API
      // await axios.post('/api/cart', { productId: product._id, quantity: qty });
      alert(`Added ${qty} × "${product.title}" to cart (placeholder)`);
    } catch (err) {
      console.error(err);
      alert("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.stock === 0) return alert("Product out of stock");
    // navigate to checkout, or create order
    navigate("/checkout", { state: { buyNowProduct: { id: product._id, qty } } });
  };

  const talkToSeller = () => {
    if (!product) return;
    const seller = product.seller;
    if (seller && typeof seller === "object" && seller.email) {
      window.location.href = `mailto:${seller.email}?subject=Inquiry about ${encodeURIComponent(product.title)}`;
      return;
    }
    if (seller && typeof seller === "string") {
      navigate(`/contact?seller=${encodeURIComponent(seller)}&productId=${product._id}`);
      return;
    }
    navigate("/contact");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-gray-600 text-lg">Loading product…</div>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="max-w-xl w-full bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-2">Unable to load product</h2>
          <p className="text-sm text-gray-600 mb-4">{errorMsg || "Product not found."}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 rounded-lg">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  const images = allImages();
  const mainImage = selectedImage || images[0] || "/placeholder.svg";

  // rating visualization
  const avg = Number(product.average_rating || 0);
  const fullStars = Math.floor(avg);
  const halfStar = avg - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            ← Back
          </button>
          <div className="text-sm text-gray-500">Product ID: <span className="font-mono text-xs text-gray-700 ml-2">{product._id}</span></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Images */}
          <div className="lg:col-span-6">
            <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
              <img
                src={mainImage}
                alt={product.title}
                className="w-full h-[520px] object-cover transition-transform duration-400 ease-out hover:scale-105"
              />
            </div>

            {/* thumbnails */}
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedImage(img); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`flex-none w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === img ? "border-indigo-600" : "border-transparent"} shadow-sm`}
                    aria-label={`Select image ${i + 1}`}
                  >
                    <img src={img} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight">{product.title}</h1>
                  <p className="mt-2 text-sm text-gray-500 max-w-prose">{product.subtitle || ""}</p>
                </div>

                {/* Category badge */}
                {product.category && (
                  <div className="ml-4 self-start">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                      {product.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Rating & meta */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <svg key={"f"+i} className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L10 13.347l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                    </svg>
                  ))}
                  {halfStar && (
                    <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L10 13.347V2.927z" />
                    </svg>
                  )}
                  {Array.from({ length: emptyStars }).map((_, i) => (
                    <svg key={"e"+i} className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L10 13.347l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.644 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
                    </svg>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  {avg ? `${avg.toFixed(1)} • ` : ""}{product.rating_number ?? 0} ratings
                </div>
                <div className="ml-auto text-sm text-gray-500">SKU: <span className="font-mono">{product.sku || product._id.slice(0,8)}</span></div>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-center gap-6">
                <div className="text-3xl lg:text-4xl font-extrabold text-indigo-600">₹{currency(product.price)}</div>
                {product.compareAt && (
                  <div className="text-sm text-gray-400 line-through">₹{currency(product.compareAt)}</div>
                )}
                {product.stock !== undefined && (
                  <div className={`px-2 py-1 rounded-full text-sm font-medium ${product.stock > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </div>
                )}
              </div>

              {/* Short points/features */}
              {product.features && Array.isArray(product.features) && product.features.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-indigo-600">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Description */}
              <div className="mt-6 text-gray-700 leading-relaxed whitespace-pre-line max-w-prose">
                {typeof product.description === "string" ? product.description : (Array.isArray(product.description) ? product.description.join("\n\n") : "")}
              </div>

              {/* Seller block */}
              <div className="mt-6 flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  {product.seller && typeof product.seller === "string" ? (product.seller[0] || "S").toUpperCase() : "S"}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Sold by</div>
                  <div className="font-semibold text-gray-900">{product.seller && typeof product.seller === "object" ? (product.seller.name || "Seller") : (product.seller || "Anonymous Seller")}</div>
                  <div className="text-sm text-gray-500">{product.seller && typeof product.seller === "object" && product.seller.location ? product.seller.location : ""}</div>
                </div>

                <div className="ml-auto flex gap-2">
                  <button onClick={talkToSeller} className="px-3 py-2 bg-white border rounded-md text-sm">Contact</button>
                  <button onClick={() => alert('Seller follow placeholder')} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">Follow</button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-md border divide-x overflow-hidden">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                      aria-label="Decrease quantity"
                    >−</button>
                    <div className="px-4 py-2 bg-white text-sm font-medium">{qty}</div>
                    <button
                      onClick={() => setQty((q) => Math.min((product.stock || 99), q + 1))}
                      className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                      aria-label="Increase quantity"
                    >+</button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={adding || product.stock === 0}
                    className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold ${product.stock === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
                  >
                    {adding ? "Adding..." : `Add to Cart • ₹${currency(product.price * qty)}`}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    className={`px-4 py-3 rounded-lg ${product.stock === 0 ? "bg-gray-200" : "bg-white border"}`}
                  >
                    Buy Now
                  </button>
                </div>

                <div className="mt-3 text-sm text-gray-500">Secure checkout • Easy returns • COD available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky actions */}
        <div className="fixed left-0 right-0 bottom-0 sm:hidden bg-white/95 border-t py-3 px-4 flex items-center gap-3 justify-between">
          <div>
            <div className="text-sm text-gray-500">Total</div>
            <div className="font-semibold text-lg">₹{currency(product.price * qty)}</div>
          </div>
          <div className="flex gap-2 w-1/2">
            <button onClick={handleAddToCart} disabled={product.stock === 0} className="flex-1 px-3 py-3 rounded-lg bg-indigo-600 text-white">Add</button>
            <button onClick={handleBuyNow} disabled={product.stock === 0} className="flex-1 px-3 py-3 rounded-lg bg-white border">Buy</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
