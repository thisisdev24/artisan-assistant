import React from 'react';
import { Link } from "react-router-dom";
import Navbar from '../components/Navbar/Navbar';
import Hero from '../components/hero/Hero';


function Home() {
  return (
    <div>
      <Hero />
      <h1>Welcome to Artisan Assistant</h1>
      <p>This is the Home page.</p>
    </div>
  );
}

export default Home;
