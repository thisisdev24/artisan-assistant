import React from 'react';
import Navbar from './components/Navbar/Navbar';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";

// Import pages from "pages" folder
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Hero from './components/hero/Hero';
import Seller from './components/Artist/Seller'
import CreateListing from './components/Artist/CreateListing';
import ProductDetailsForm from './components/Artist/ProductDetailsForm';
import ShowListing from './components/Artist/ShowListing';
import SearchResults from './pages/SearchResults';
import ShowListingPublic from './pages/ShowListingPublic';
import ProductDetail from "./pages/ProductDetail";
import Profile from "./pages/Profile";
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import Artists from "./pages/Artists";
import Admin from './components/Admin/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import MyWishlist from './pages/MyWishlist';
import RecentlyViewed from './pages/RecentlyViewed';
import EditProduct from './pages/EditProduct';
import SellerOrders from './pages/SellerOrders';
import SellerProfile from './pages/SellerProfile';

import { LoggerProvider } from './utils/logger/loggerProvider.jsx';
// import Products from "./pages/Products";
// import Artists from "./pages/Artists";
// import Shorts from "./pages/Shorts";
import Contact from "./pages/contact";

function App() {
  // read store from localStorage (if available)
  //const storeFromStorage = typeof window !== "undefined" ? localStorage.getItem("store") : null;

  return (
    // >>> Wrap the whole app with LoggerProvider <<<
    <LoggerProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/ShowListingPublic" element={<ShowListingPublic />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/artists" element={<Artists />} />

          {/* Protected Routes */}
          <Route
            path="/Seller"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <Seller />
              </ProtectedRoute>
            }
          />
          <Route
            path="/CreateListing"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/product-details/:id"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <ProductDetailsForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ShowListing"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <ShowListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/edit-product/:id"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <EditProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/orders"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/profile"
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-wishlist"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <MyWishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recently-viewed"
            element={<RecentlyViewed />}
          />
          <Route
            path="/Admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          {/*<Route path="/artists" element={<Artists />} />


        {/* <Route path="/products" element={<Products />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/contact" element={<Contact />} /> */}
        </Routes>
      </Router>
    </LoggerProvider>
  );
}

export default App;
