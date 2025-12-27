import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSeller } = useAuth();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [stockAvailable, setStockAvailable] = useState(true);
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');
  const [mainCategory, setMainCategory] = useState('Handmade');

  useEffect(() => {
    if (!isSeller) {
      navigate('/login');
      return;
    }

    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/api/listings/${id}`);
        const data = response.data;
        setProduct(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(data.price?.toString() || '');
        setStock(data.stock?.toString() || '0');
        setStockAvailable(data.stock_available !== undefined ? data.stock_available : true);
        setFeatures(Array.isArray(data.features) ? data.features : []);
        setMainCategory(data.main_category || 'Handmade');
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err?.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, isSeller, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !price) {
      alert('Title and price are required');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        title,
        description,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        stock_available: stockAvailable,
        features,
        main_category: mainCategory
      };

      await apiClient.put(`/api/listings/${id}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      alert('Product updated successfully!');
      navigate('/ShowListing');
    } catch (err) {
      console.error('Update error:', err);
      alert(err?.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <button onClick={() => navigate('/ShowListing')} className="bg-indigo-600 text-white px-4 py-2 rounded">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 ">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Edit Product</h1>
          <button
            onClick={() => navigate('/ShowListing')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Product Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="5"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Category</label>
            <select
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Handmade">Handmade</option>
              <option value="Art">Art</option>
              <option value="Craft">Craft</option>
              <option value="Jewelry">Jewelry</option>
              <option value="Home Decor">Home Decor</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = featureInput.trim();
                    if (trimmed && !features.includes(trimmed)) {
                      setFeatures([...features, trimmed]);
                      setFeatureInput('');
                    }
                  }
                }}
                placeholder="Enter a feature and press Enter"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = featureInput.trim();
                  if (trimmed && !features.includes(trimmed)) {
                    setFeatures([...features, trimmed]);
                    setFeatureInput('');
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {features.map((feat, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                  >
                    {feat}
                    <button
                      type="button"
                      onClick={() => setFeatures(features.filter((_, i) => i !== index))}
                      className="text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={stockAvailable}
                  onChange={(e) => setStockAvailable(e.target.checked)}
                  className="mr-2 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700">Stock Available</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/ShowListing')}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;

