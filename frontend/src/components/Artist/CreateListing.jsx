import { useState } from 'react';
import axios from 'axios';

const CreateListing = () => {
  const [main_category] = useState('Handmade');
  const [title, setTitle] = useState('');
  const [average_rating] = useState('');
  const [rating_number] = useState('');
  const [features] = useState([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [files, setFiles] = useState([]);
  const [store] = useState('');
  const [categories] = useState([]);
  const [details] = useState('');
  const [parent_asin] = useState('');
  const token = localStorage.getItem('token');

  async function handleAutoDesc() {
    try {
      const data = {
        title: title,
        features: features,
        category: main_category
      };
      const res = await axios.post('http://localhost:5000/api/generate_description', data);
      if (res?.data?.description) setDescription(res.data.description);
    } catch (err) {
      console.error('Auto-generate error:', err?.response?.data || err.message);
      alert('Auto description failed. See console for details.');
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (!title || !price) {
      alert('Title and price are required.');
      return;
    }

    const formData = new FormData();
    formData.append('main_category', main_category);
    formData.append('title', title);
    formData.append('average_rating', average_rating);
    formData.append('rating_number', rating_number);

    // stringify arrays/objects before adding to FormData
    formData.append('features', JSON.stringify(features));
    formData.append('description', description);
    formData.append('price', price);

    // append images only
    files.forEach(f => formData.append('images', f));

    formData.append('store', store);
    formData.append('categories', JSON.stringify(categories));
    formData.append('details', details);
    formData.append('parent_asin', parent_asin);

    try {
      const res = await axios.post('http://localhost:5000/api/listings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        }
      });
      alert('Created');
      console.log('Created listing:', res.data);
      window.location.href = `/listings/${res.data._id}`;
    } catch (err) {
      console.error('Publish error:', err?.response?.data || err.message);
      alert('Publish failed. See console for details.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 p-6">
      <form onSubmit={submit} className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-blue-100">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">Publish Your Product</h2>

        <div className="mb-5">
          <label className="block text-gray-700 mb-2">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter product title" className="w-full px-4 py-2 border rounded-lg" />
        </div>

        <div className="mb-5">
          <label className="block text-gray-700 mb-2">Price</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter product price" className="w-full px-4 py-2 border rounded-lg" />
        </div>

        <div className="mb-5">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write a brief description..." rows="4" className="w-full px-4 py-2 border rounded-lg" />
        </div>

        <div className="mb-5">
          <label className="block text-gray-700 mb-2">Upload Images</label>
          <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} className="w-full" />
        </div>

        <div className="flex gap-4 mt-6">
          <button type="button" onClick={handleAutoDesc} className="flex-1 bg-blue-500 text-white py-2 rounded-lg">✨ Auto-generate Description</button>
          <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg">🚀 Publish</button>
        </div>
      </form>
    </div>
  );
};

export default CreateListing;
