import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import {
    ArrowLeft, Package, Store, Calendar, Star, Tag,
    DollarSign, ShoppingBag, Eye, ExternalLink,
    AlertTriangle, Check, X, Box, Info, Truck, Clock, Download
} from 'lucide-react';

// Helper to extract image URL from various formats
const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.large || img.thumb || img.hi_res || img.variant || img.url || null;
};

// Helper to format dimensions object
const formatDimensions = (dim) => {
    if (!dim) return 'N/A';
    if (typeof dim === 'string') return dim;
    const parts = [];
    if (dim.length) parts.push(`L: ${dim.length}`);
    if (dim.width) parts.push(`W: ${dim.width}`);
    if (dim.height) parts.push(`H: ${dim.height}`);
    if (dim.weight) parts.push(`Weight: ${dim.weight}`);
    return parts.length > 0 ? parts.join(' × ') : 'N/A';
};

// Helper for relative time - Today/Yesterday with time, or full date for older
const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const d = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (dateOnly.getTime() === today.getTime()) return `Today, ${timeStr}`;
    if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [seller, setSeller] = useState(null);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        loadProductDetails();
    }, [id]);

    const loadProductDetails = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/api/admin/listings/${id}`);
            setProduct(res.data.listing);
            setSeller(res.data.seller);
        } catch (err) {
            console.error('Failed to load product:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteProduct = async () => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await apiClient.delete(`/api/admin/${id}/approve-delete`);
            navigate('/admin/products');
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!product) return (
        <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Product not found</p>
            <button onClick={() => navigate('/admin/products')} className="mt-4 text-indigo-600 font-medium hover:underline">
                Back to Products
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
            <button onClick={() => navigate('/admin/products')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Products
            </button>

            {/* Header / Title Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
                    <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full font-medium border ${product.is_active || product.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {product.is_active || product.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" /> {product.category || 'Uncategorized'}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Listed {formatRelativeTime(product.createdAt)}
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            const data = { product, seller, exportedAt: new Date().toISOString() };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `product_${product.title?.replace(/\s+/g, '_')}_${product._id}.json`;
                            a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => window.open(`/products/${product._id}`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                    >
                        <ExternalLink className="w-4 h-4" /> View Live
                    </button>
                    <button
                        onClick={deleteProduct}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 font-medium text-sm"
                    >
                        <X className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column: Images */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                        {getImageUrl(product.images?.[activeImage]) ? (
                            <img src={getImageUrl(product.images[activeImage])} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package className="w-16 h-16" />
                            </div>
                        )}
                    </div>
                    {product.images?.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                            {product.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(idx)}
                                    className={`aspect-square rounded-lg overflow-hidden border-2 ${activeImage === idx ? 'border-indigo-600' : 'border-transparent'}`}
                                >
                                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Middle Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Price & Stock Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Price</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-gray-900">₹{product.price?.toLocaleString()}</span>
                                    {product.compare_price > product.price && (
                                        <span className="text-sm text-gray-400 line-through">₹{product.compare_price?.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="sm:border-l sm:border-gray-100 sm:pl-6">
                                <p className="text-sm text-gray-500 mb-1">Stock</p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xl font-semibold ${(product.stock || product.quantity) > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                        {product.stock || product.quantity || 0}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${(product.stock || product.quantity) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {(product.stock || product.quantity) > 0 ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                            <div className="sm:border-l sm:border-gray-100 sm:pl-6">
                                <p className="text-sm text-gray-500 mb-1">Rating</p>
                                <div className="flex items-center gap-1">
                                    <span className="text-xl font-semibold text-gray-900">{product.rating?.toFixed(1) || '0.0'}</span>
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span className="text-xs text-gray-400">({product.rating_count || 0} reviews)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400" /> Description
                        </h3>
                        <div className="prose prose-sm max-w-none text-gray-600">
                            <p className="whitespace-pre-line">{product.description || 'No description provided.'}</p>
                        </div>
                    </div>

                    {/* Attributes/Details Grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Box className="w-4 h-4 text-gray-400" /> Product Specifications
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Materials</span>
                                    <span className="font-medium text-gray-900 text-right">{product.materials?.join(', ') || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Dimensions</span>
                                    <span className="font-medium text-gray-900 text-right">{formatDimensions(product.dimensions)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">Weight</span>
                                    <span className="font-medium text-gray-900 text-right">{typeof product.weight === 'object' ? (product.weight?.value || 'N/A') : (product.weight || (product.dimensions?.weight) || 'N/A')}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500">SKU</span>
                                    <span className="font-medium text-gray-900 text-right">{product.sku || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Seller Info */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Store className="w-4 h-4 text-gray-400" /> Seller Information
                            </h3>
                            {seller ? (
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                        {seller.store_logo ? (
                                            <img src={seller.store_logo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                                                {seller.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 cursor-pointer hover:underline" onClick={() => navigate(`/admin/sellers/${seller._id}`)}>
                                            {seller.store || seller.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 mb-2">{seller.email}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${seller.verification?.status === 'verified' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                                {seller.verification?.status || 'Unverified'}
                                            </span>
                                            <button
                                                onClick={() => navigate(`/admin/sellers/${seller._id}`)}
                                                className="text-xs text-indigo-600 font-medium hover:underline ml-auto"
                                            >
                                                View Seller Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <AlertTriangle className="w-4 h-4" /> Seller info unavailable
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping/Delivery (Optional Section) */}
                    {product.shipping_options && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-gray-400" /> Shipping & Delivery
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {product.shipping_options.map((opt, i) => (
                                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-sm text-gray-900">{opt.name}</span>
                                            <span className="text-sm font-semibold">₹{opt.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{opt.duration}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
