
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
import ShowListing from './components/Artist/ShowListing';
import SearchResults from './pages/SearchResults';
import ShowListingPublic from './pages/ShowListingPublic';
// import Products from "./pages/Products";
// import Artists from "./pages/Artists";
// import Shorts from "./pages/Shorts";
// import Contact from "./pages/Contact";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Seller" element={<Seller />} />
        <Route path="/CreateListing" element={<CreateListing />} />
        <Route path="/ShowListing" element={<ShowListing />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/ShowListingPublic" element={<ShowListingPublic />} />
        {/*<Route path="/artists" element={<Artists />} />


        {/* <Route path="/products" element={<Products />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/contact" element={<Contact />} /> */}
      </Routes>
    </Router>
  );
}

export default App;