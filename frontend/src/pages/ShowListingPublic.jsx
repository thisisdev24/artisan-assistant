import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ShowListing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch the current seller's listed products
        const response = await axios.get("http://localhost:5000/api/listings/retrieve", {});
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleBack = () => navigate("/Home");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-600">
        Loading your products...
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
            <p className="text-lg">No products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 flex flex-col"
              >
                <img
                  src={product.images?.[0] || "/placeholder.jpg"}
                  alt={product.title}
                  className="w-full h-56 object-cover rounded-lg mb-4"
                />

                <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                  {product.title}
                </h2>

                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.description?.[0]}
                </p> 

                <div className="flex items-center text-yellow-500 text-sm mb-3">
                  ⭐ {product.average_rating || 0} ({product.rating_number || 0} ratings)
                </div>

                <div className="flex justify-between items-center mt-auto">
                  <span className="text-indigo-600 font-bold text-lg">
                    ₹{product.price}
                  </span>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105">
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
