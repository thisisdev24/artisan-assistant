
import React from 'react';
import Navbar from './components/Navbar/Navbar';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";



// Import pages from "pages" folder
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Hero from './components/hero/Hero';
<<<<<<< HEAD
import Products from "./pages/CreateListing";
||||||| bff23ab
// import Products from "./pages/Products";
=======
import Seller from './components/Artist/Seller'
// import Products from "./pages/Products";
>>>>>>> be19c9af397f2645e3a5bdf400bac8be8944dc09
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
<<<<<<< HEAD
        <Route path="/products" element={<Products />} />
        {/*<Route path="/artists" element={<Artists />} />
||||||| bff23ab
        {/* <Route path="/products" element={<Products />} />
        <Route path="/artists" element={<Artists />} />
=======
        <Route path="/Seller" element={<Seller/>}/>


        {/* <Route path="/products" element={<Products />} />
        <Route path="/artists" element={<Artists />} />
>>>>>>> be19c9af397f2645e3a5bdf400bac8be8944dc09
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/contact" element={<Contact />} /> */}
      </Routes>
    </Router>
  );
}

export default App;