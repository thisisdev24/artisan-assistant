import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../utils/apiClient';

const Admin = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'stats') {
            loadStats();
        } else if (activeTab === 'users') {
            loadUsers();
        } else if (activeTab === 'sellers') {
            loadSellers();
        } else if (activeTab === 'listings') {
            loadListings();
        }
    }, [activeTab]);

    const loadStats = async () => {
        try {
            const response = await apiClient.get('/api/admin/stats');
            setStats(response.data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/admin/users');
            setUsers(response.data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
            alert(err.response?.data?.msg || 'Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSellers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/admin/sellers');
            setSellers(response.data || []);
        } catch (err) {
            console.error('Failed to load sellers:', err);
            alert(err.response?.data?.msg || 'Failed to load sellers');
            setSellers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadListings = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/admin/listings');
            setListings(response.data || []);
        } catch (err) {
            console.error('Failed to load listings:', err);
            alert(err.response?.data?.msg || 'Failed to load listings');
            setListings([]);
        } finally {
            setLoading(false);
        }
    };

    const updateUserStatus = async (userId, status) => {
        try {
            await apiClient.put(`/api/admin/users/${userId}/status`, { status });
            loadUsers();
            loadSellers();
            if (activeTab === 'stats') loadStats();
        } catch (err) {
            console.error('Failed to update status:', err);
            alert(err.response?.data?.msg || 'Failed to update user status');
        }
    };

    const blockUser = async (userId, blocked) => {
        try {
            await apiClient.put(`/api/admin/users/${userId}/block`, { blocked });
            loadUsers();
            loadSellers();
            if (activeTab === 'stats') loadStats();
        } catch (err) {
            console.error('Failed to block/unblock user:', err);
            alert(err.response?.data?.msg || 'Failed to block/unblock user');
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await apiClient.delete(`/api/admin/users/${userId}`);
            loadUsers();
            loadSellers();
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert('Failed to delete user');
        }
    };

    const deleteListing = async (listingId) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;
        try {
            await apiClient.delete(`/api/admin/listings/${listingId}`);
            loadListings();
        } catch (err) {
            console.error('Failed to delete listing:', err);
            alert('Failed to delete listing');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
                <p className="text-gray-600 mb-6">Welcome, {user?.name}</p>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 font-semibold ${activeTab === 'stats'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Statistics
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 font-semibold ${activeTab === 'users'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('sellers')}
                        className={`px-4 py-2 font-semibold ${activeTab === 'sellers'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Sellers
                    </button>
                    <button
                        onClick={() => setActiveTab('listings')}
                        className={`px-4 py-2 font-semibold ${activeTab === 'listings'
                                ? 'border-b-2 border-indigo-600 text-indigo-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Listings
                    </button>
                </div>

                {/* Stats Tab */}
                {activeTab === 'stats' && stats && (
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Users</h3>
                            <p className="text-3xl font-bold text-indigo-600">{stats.users}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Sellers</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.sellers}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Listings</h3>
                            <p className="text-3xl font-bold text-blue-600">{stats.listings}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Admins</h3>
                            <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center">Loading...</td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center">No users found</td>
                                        </tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u._id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{u.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            u.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                                u.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {u.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={u.status || 'active'}
                                                            onChange={(e) => updateUserStatus(u._id, e.target.value)}
                                                            className="text-sm border rounded px-2 py-1"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                            <option value="suspended">Suspended</option>
                                                            <option value="blocked">Blocked</option>
                                                        </select>
                                                        <button
                                                            onClick={() => blockUser(u._id, u.status !== 'blocked')}
                                                            className={`text-sm px-3 py-1 rounded ${u.status === 'blocked'
                                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                                                }`}
                                                        >
                                                            {u.status === 'blocked' ? 'Unblock' : 'Block'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(u._id)}
                                                            className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Sellers Tab */}
                {activeTab === 'sellers' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center">Loading...</td>
                                        </tr>
                                    ) : sellers.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center">No sellers found</td>
                                        </tr>
                                    ) : (
                                        sellers.map((s) => (
                                            <tr key={s._id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{s.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{s.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{s.store}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            s.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                                s.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {s.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={s.status || 'active'}
                                                            onChange={(e) => updateUserStatus(s._id, e.target.value)}
                                                            className="text-sm border rounded px-2 py-1"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                            <option value="suspended">Suspended</option>
                                                            <option value="blocked">Blocked</option>
                                                        </select>
                                                        <button
                                                            onClick={() => blockUser(s._id, s.status !== 'blocked')}
                                                            className={`text-sm px-3 py-1 rounded ${s.status === 'blocked'
                                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                                                }`}
                                                        >
                                                            {s.status === 'blocked' ? 'Unblock' : 'Block'}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(s._id)}
                                                            className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Listings Tab */}
                {activeTab === 'listings' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center">Loading...</td>
                                        </tr>
                                    ) : listings.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center">No listings found</td>
                                        </tr>
                                    ) : (
                                        listings.map((l) => (
                                            <tr key={l._id}>
                                                <td className="px-6 py-4">{l.title || 'Untitled'}</td>
                                                <td className="px-6 py-4">₹{l.price || 0}</td>
                                                <td className="px-6 py-4">{l.store || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => deleteListing(l._id)}
                                                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;

