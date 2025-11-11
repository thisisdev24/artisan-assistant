import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

const SearchResults = () => {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get("query");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query) {
      axios.get(`http://localhost:5000/api/listing/search?query=${query}`)
        .then((res) => setResults(res.data))
        .catch((err) => console.error(err));
    }
  }, [query]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Search Results for "{query}"</h1>
      {results.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {results.map((item) => (
            <div key={item._id} className="p-4 border rounded-lg shadow-md">
              <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover mb-2" />
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-gray-700">₹{item.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
