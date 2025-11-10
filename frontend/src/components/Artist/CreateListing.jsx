import { useState } from 'react'
import axios from 'axios';

const CreateListing = () => {
  const [main_category] = useState('Handmade');
  const [title, setTitle] = useState('');
  const [average_rating] = useState('');
  const [rating_number] = useState('');
  const [features] = useState([]);
  const [description, setDescription] = useState([]);
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState([]);
  const [store] = useState('');
  const [categories] = useState([]);
  const [details] = useState('');
  const [parent_asin] = useState('');
  const token = localStorage.getItem('token');

  async function handleAutoDesc() {
    try {
      const data = { title, category: 'Handicraft' }; // send more if needed
      const res = await axios.post('http://localhost:5000/api/ml/generate-description', data);
      setDescription(res.data.description);
    } catch (err) { console.error(err) }
  }

  async function submit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('main_category', main_category);
    formData.append('title', title);
    formData.append('average_rating', average_rating);
    formData.append('rating_number', rating_number);
    formData.append('features', features);
    formData.append('description', description);
    formData.append('price', price);
    files.forEach(f => formData.append('images', f));
    files.forEach(f => formData.append('videos', f));
    formData.append('store', store);
    formData.append('categories', categories);
    formData.append('details', details);
    formData.append('parent_asin', parent_asin);

    const res = await axios.post('http://localhost:5000/api/listings/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': 'Bearer ' + token } });
    alert('created');
    alert(JSON.stringify(res.data, ["title", "price", "description"], 2));

    window.location.href = `/listings/${res.data._id}`;
  }

  // return (
  //   <form onSubmit={submit}>
  //     <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
  //     <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price"/>
  //     <textarea value={description} onChange={e=>setDescription(e.target.value)}/>
  //     <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files))}/>
  //     <button type="button" onClick={handleAutoDesc}>Auto-generate description</button>
  //     <button type="submit">Publish</button>
  //   </form>
  // );
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-blue-100"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-700 drop-shadow-sm">
          Publish Your Product
        </h2>

        {/* Title Input */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter product title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
          />
        </div>

        {/* Price Input */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter product price"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
          />
        </div>

        {/* Description Textarea */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a brief description..."
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition resize-none"
          />
        </div>

        {/* File Upload */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">
            Upload Images
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            type="button"
            onClick={handleAutoDesc}
            className="w-full sm:w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-2 rounded-lg shadow-md hover:scale-105 transition-transform"
          >
            ✨ Auto-generate Description
          </button>

          <button
            type="submit"
            className="w-full sm:w-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 rounded-lg shadow-md hover:scale-105 transition-transform"
          >
            🚀 Publish
          </button>
        </div>
      </form>
    </div>
  );
};


export default CreateListing;