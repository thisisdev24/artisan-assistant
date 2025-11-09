import React from "react";
import { useNavigate } from "react-router-dom";

const Seller = () => {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        navigate(path);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-16 px-6">
            <h1 className="text-4xl font-bold mb-10 text-gray-800">Seller Dashboard</h1>

            <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl">
                {/* Card 1: Add New Product */}
                <div className="bg-white shadow-lg rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300">
                    <div className="text-5xl mb-4">➕</div>

                    <h2 className="text-2xl font-semibold mb-2">Add New Product</h2>
                    <p className="text-gray-600 mb-6">
                        List a new product for buyers to discover and purchase.
                    </p>
                    <button
                        onClick={() => handleNavigation("/CreateListing")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
                    >
                        Add Product
                    </button>
                </div>

                {/* Card 2: View Products */}
                <div className="bg-white shadow-lg rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300">
                    <div className="text-5xl mb-4">👁️</div>

                    <h2 className="text-2xl font-semibold mb-2">View Products</h2>
                    <p className="text-gray-600 mb-6">
                        Browse through all your listed products.
                    </p>
                    <button
                        onClick={() => handleNavigation("/seller/view-products")}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
                    >
                        View Products
                    </button>
                </div>

                {/* Card 3: Edit Products */}
                <div className="bg-white shadow-lg rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300">
                    <div className="text-5xl mb-4">✏️</div>

                    <h2 className="text-2xl font-semibold mb-2">Edit Products</h2>
                    <p className="text-gray-600 mb-6">
                        Update prices, descriptions, or product details anytime.
                    </p>
                    <button
                        onClick={() => handleNavigation("/seller/edit-products")}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
                    >
                        Edit Products
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Seller;
