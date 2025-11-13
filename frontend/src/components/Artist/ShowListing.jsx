import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/**
 * If you have the current seller's store name available (e.g. from user profile),
 * pass it in via query param or set it here. Example uses optional query param.
 */
const ShowListing = ({ storeName }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // If you have storeName in props/state, include it as query param:
        const url = storeName
          ? `http://localhost:5000/api/listings/retrieve?store=${encodeURIComponent(storeName)}`
          : `http://localhost:5000/api/listings/retrieve`;

        const response = await axios.get(url, {
          withCredentials: true,
        });

        // backend returns array mapped with imageUrl
        setProducts(response.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        setErrorMsg(error?.response?.data?.message || error.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeName]);

  const handleBack = () => navigate("/Seller");

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
                  src={product.imageUrl || (product.images && product.images[0] && product.images[0].thumbnailUrl) || "/placeholder.jpg"}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {product.title}
                </h2>
                <p className="text-gray-600 mb-2">{product.description}</p>
                <p className="text-lg font-bold text-indigo-700 mb-4">
                  ₹{product.price}
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
