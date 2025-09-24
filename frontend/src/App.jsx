
import React from 'react';
import Navbar from './components/Navbar/Navbar';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";



// Import pages from "pages" folder
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Hero from './components/hero/Hero';
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
        {/* <Route path="/products" element={<Products />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/contact" element={<Contact />} /> */}
      </Routes>
    </Router>
  );
}

export default App;