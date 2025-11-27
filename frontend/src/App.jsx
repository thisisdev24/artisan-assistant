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
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import Artists from "./pages/Artists";

import { LoggerProvider } from './utils/logger/loggerProvider.jsx';
// import Products from "./pages/Products";
// import Artists from "./pages/Artists";
// import Shorts from "./pages/Shorts";
import Contact from "./pages/Contact";

function App() {
  // read store from localStorage (if available)
  const storeFromStorage = typeof window !== "undefined" ? localStorage.getItem("store") : null;

  return (
    // >>> Wrap the whole app with LoggerProvider <<<
    <LoggerProvider>
      <Router>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/Seller" element={<Seller />} />
          <Route path="/CreateListing" element={<CreateListing />} />
          <Route path="/product-details/:id" element={<ProductDetailsForm />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ShowListing" element={<ShowListing storeName={storeFromStorage || undefined} />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/ShowListingPublic" element={<ShowListingPublic />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/artists" element={<Artists />} />

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
