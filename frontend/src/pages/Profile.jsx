import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

import Wishlist from '../components/Wishlist/Wishlist';

const Profile = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user: authUser, logout, loading: authLoading } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal');
    const [error, setError] = useState(null);

    // Check for tab in URL params
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && ['personal', 'addresses', 'orders', 'wishlist', 'reviews'].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!authLoading && !authUser) {
            navigate("/login");
            return;
        }

        if (authUser) {
            fetchProfile();
        }
    }, [authUser, authLoading, navigate]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/auth/profile-full');
            setProfileData(res.data);
        } catch (err) {
            console.error("Failed to fetch profile", err);
            setError("Failed to load profile data.");
        } finally {
            setLoading(false);
        }
    };

    // Callback to update wishlist count in profile data when items are removed
    const handleWishlistUpdate = (newCount) => {
        setProfileData(prev => ({ ...prev, wishlist_count: newCount }));
    };

    if (authLoading || loading) {
        return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex justify-center items-center flex-col gap-4">
                <p className="text-red-500">{error}</p>
                <button onClick={fetchProfile} className="text-primary underline">Retry</button>
            </div>
        );
    }

    if (!profileData) return null;

    const role = authUser.role;

    // Tabs configuration
    const getTabs = () => {
        const tabs = [{ id: 'personal', label: 'Personal Info' }];
        if (role === 'buyer') {
            tabs.push({ id: 'addresses', label: 'Addresses' });
            tabs.push({ id: 'orders', label: 'My Orders' });
            tabs.push({ id: 'wishlist', label: 'Wishlist' });
            tabs.push({ id: 'reviews', label: 'My Reviews' });
        } else if (role === 'seller') {
            tabs.push({ id: 'storefront', label: 'Storefront' });
            tabs.push({ id: 'settings', label: 'Settings' });
            tabs.push({ id: 'payouts', label: 'Payouts' });
            tabs.push({ id: 'verification', label: 'Verification' });
            tabs.push({ id: 'warehouses', label: 'Warehouses' });
            tabs.push({ id: 'notifications', label: 'Notifications' });
        } else if (role === 'admin') {
            tabs.push({ id: 'security', label: 'Security' });
        }
        return tabs;
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'personal':
                return <PersonalInfoSection data={profileData.details} role={role} />;
            case 'addresses':
                return <AddressesSection addresses={profileData.addresses} onChange={fetchProfile} />;
            case 'orders':
                return <OrdersSection orders={profileData.recent_orders} />;
            case 'wishlist':
                return <Wishlist count={profileData.wishlist_count} onUpdate={handleWishlistUpdate} />;
            case 'reviews':
                return <MyReviewsSection />;
            case 'storefront':
                return <StorefrontSection data={profileData.storefront} />;
            case 'settings':
                return <SettingsSection data={profileData.settings} />;
            case 'payouts':
                return <PayoutsSection data={profileData.payout_account} />;
            case 'verification':
                return <VerificationSection documents={profileData.documents} />;
            case 'warehouses':
                return <WarehousesSection warehouses={profileData.warehouses} />;
            case 'notifications':
                return <NotificationsSection data={profileData.notification_pref} />;
            case 'security':
                return <SecuritySection data={profileData.details} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Sidebar / Tabs */}
                <div className="w-full md:w-64 bg-gray-100 p-6 border-r border-gray-200">
                    <div className="mb-8 text-center">
                        <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                            {authUser.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="font-bold text-gray-800 truncate">{authUser.name}</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{role}</p>
                    </div>

                    <nav className="flex flex-col gap-2">
                        {getTabs().map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    // Update URL without navigation
                                    const newSearchParams = new URLSearchParams(searchParams);
                                    if (tab.id === 'personal') {
                                        newSearchParams.delete('tab');
                                    } else {
                                        newSearchParams.set('tab', tab.id);
                                    }
                                    navigate({ search: newSearchParams.toString() }, { replace: true });
                                }}
                                className={`text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === tab.id
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <button
                            onClick={logout}
                            className="text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium mt-4"
                        >
                            Logout
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                        {getTabs().find(t => t.id === activeTab)?.label}
                    </h1>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

/* --- Sub-components (Internal for now) --- */

const PersonalInfoSection = ({ data, role }) => (
    <div className="space-y-4">
        <InfoRow label="Name" value={data.name} />
        <InfoRow label="Email" value={data.email} />
        <InfoRow label="Role" value={role} />
        {data.phone && <InfoRow label="Phone" value={data.phone} />}
        {data.store && <InfoRow label="Store Name" value={data.store} />}
    </div>
);

const AddressesSection = ({ addresses, onChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: true
    });

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await apiClient.post('/api/addresses', form);
            setShowForm(false);
            setForm({
                name: '',
                phone: '',
                line1: '',
                line2: '',
                city: '',
                state: '',
                postal_code: '',
                country: 'India',
                is_default: true
            });
            if (onChange) onChange();
        } catch (err) {
            console.error('Failed to save address', err);
            setError(err?.response?.data?.msg || 'Failed to save address.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {addresses && addresses.length > 0 ? (
                <div className="grid gap-4">
                    {addresses.map(addr => (
                        <div key={addr._id} className="border p-4 rounded-lg relative">
                            {addr.is_default && <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Default</span>}
                            <p className="font-semibold">{addr.name}</p>
                            <p className="text-sm text-gray-600">{addr.line1}</p>
                            {addr.line2 && <p className="text-sm text-gray-600">{addr.line2}</p>}
                            <p className="text-sm text-gray-600">{addr.city}, {addr.state} {addr.postal_code}</p>
                            <p className="text-sm text-gray-600">{addr.country}</p>
                            <p className="text-sm text-gray-600 mt-1">Phone: {addr.phone}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No addresses saved.</p>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-primary text-sm font-medium hover:underline"
                >
                    + Add New Address
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2 bg-gray-50 p-4 rounded-lg">
                    <Input label="Full Name" value={form.name} onChange={e => handleFieldChange('name', e.target.value)} required />
                    <Input label="Phone" value={form.phone} onChange={e => handleFieldChange('phone', e.target.value)} required />
                    <Input label="Address Line 1" value={form.line1} onChange={e => handleFieldChange('line1', e.target.value)} required full />
                    <Input label="Address Line 2" value={form.line2} onChange={e => handleFieldChange('line2', e.target.value)} full />
                    <Input label="City" value={form.city} onChange={e => handleFieldChange('city', e.target.value)} required />
                    <Input label="State" value={form.state} onChange={e => handleFieldChange('state', e.target.value)} required />
                    <Input label="Postal Code" value={form.postal_code} onChange={e => handleFieldChange('postal_code', e.target.value)} required />
                    <Input label="Country" value={form.country} onChange={e => handleFieldChange('country', e.target.value)} />
                    <div className="col-span-2 flex items-center gap-2 mt-1">
                        <input
                            id="addrDefault"
                            type="checkbox"
                            checked={form.is_default}
                            onChange={e => handleFieldChange('is_default', e.target.checked)}
                        />
                        <label htmlFor="addrDefault" className="text-sm text-gray-700">Make this my default address</label>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setError(null);
                            }}
                            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : 'Save Address'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

const OrdersSection = ({ orders }) => {
    const navigate = useNavigate();

    if (!orders || orders.length === 0) {
        return <p className="text-gray-500">No recent orders.</p>;
    }

    return (
        <div className="space-y-4">
            {orders.map(order => (
                <div key={order._id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">Order #{order._id.slice(-6)}</p>
                            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="text-sm">Total: {order.currency} {order.totals?.total}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs capitalize ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {order.status}
                        </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                            {order.items.map(item => (
                                <div key={item.listing_id} className="flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.title}</p>
                                        <p className="text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/product/${item.listing_id}`, { state: { fromOrderReview: true } })}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90"
                                    >
                                        Review / View
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const StorefrontSection = ({ data }) => {
    if (!data) return <p className="text-gray-500">Storefront not configured.</p>;
    return (
        <div className="space-y-4">
            <InfoRow label="Headline" value={data.headline || "Not set"} />
            <div className="pb-2 border-b border-gray-100">
                <span className="block text-sm text-gray-500 mb-1">About</span>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{data.about || "No description"}</p>
            </div>
            <InfoRow label="Slug" value={data.slug} />
            <InfoRow label="Active" value={data.is_active ? "Yes" : "No"} />
        </div>
    );
};

const SettingsSection = ({ data }) => {
    if (!data) return <p className="text-gray-500">Settings not found.</p>;
    return (
        <div className="space-y-4">
            <InfoRow label="Auto-Accept Orders" value={data.auto_accept_orders ? "Enabled" : "Disabled"} />
            <InfoRow label="Handling Time" value={`${data.default_handling_time_days} days`} />
            <InfoRow label="Holiday Mode" value={data.holiday_mode ? "Active" : "Inactive"} />
            <InfoRow label="Timezone" value={data.timezone} />
        </div>
    );
};

const PayoutsSection = ({ data }) => {
    if (!data) return <p className="text-gray-500">No payout account linked.</p>;
    return (
        <div className="space-y-4">
            <InfoRow label="Account" value={data.masked_account || "****"} />
            <InfoRow label="Status" value={data.verification_status} />
            {data.verification_notes && <InfoRow label="Notes" value={data.verification_notes} />}
        </div>
    );
};

const VerificationSection = ({ documents }) => (
    <div>
        {documents && documents.length > 0 ? (
            <div className="space-y-3">
                {documents.map(doc => (
                    <div key={doc._id} className="flex justify-between items-center border p-3 rounded">
                        <div>
                            <p className="font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {doc.status}
                        </span>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500">No documents uploaded.</p>
        )}
        <button className="mt-4 bg-primary text-white px-4 py-2 rounded text-sm">Upload Document</button>
    </div>
);

const WarehousesSection = ({ warehouses }) => (
    <div>
        {warehouses && warehouses.length > 0 ? (
            <div className="space-y-3">
                {warehouses.map(wh => (
                    <div key={wh._id} className="border p-3 rounded">
                        <p className="font-medium">{wh.name}</p>
                        <p className="text-sm text-gray-600">{wh.address?.city}, {wh.address?.state}</p>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500">No warehouses configured.</p>
        )}
    </div>
);

const NotificationsSection = ({ data }) => {
    if (!data) return <p className="text-gray-500">Preferences not set.</p>;
    return (
        <div className="space-y-4">
            <InfoRow label="Email Notifications" value={data.channels?.email?.enabled ? "On" : "Off"} />
            <InfoRow label="SMS Notifications" value={data.channels?.sms?.enabled ? "On" : "Off"} />
            <InfoRow label="Push Notifications" value={data.channels?.push?.enabled ? "On" : "Off"} />
        </div>
    );
};

const SecuritySection = ({ data }) => (
    <div className="space-y-4">
        <InfoRow label="MFA Enabled" value={data.mfa_enabled ? "Yes" : "No"} />
        {data.last_login_at && <InfoRow label="Last Login" value={new Date(data.last_login_at).toLocaleString()} />}
        {data.last_login_ip && <InfoRow label="Last Login IP" value={data.last_login_ip} />}
    </div>
);

const MyReviewsSection = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await apiClient.get('/api/reviews/my');
                setReviews(res.data || []);
            } catch (err) {
                console.error('Failed to load reviews', err);
                setError(err?.response?.data?.msg || 'Failed to load your reviews.');
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    if (loading) {
        return <div className="text-center py-10">Loading reviews...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-10">
                <p className="text-red-500 mb-2">{error}</p>
                <p className="text-sm text-gray-400">Try refreshing the page.</p>
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500 text-lg mb-4">You haven't written any reviews yet.</p>
                <p className="text-sm text-gray-400">Reviews you write will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => (
                <div key={review._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <p className="font-semibold">{review.product_title}</p>
                            <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <svg
                                        key={i}
                                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-gray-700 mt-2">{review.text}</p>
                </div>
            ))}
        </div>
    );
};

const Input = ({ label, value, onChange, required, full }) => (
    <div className={full ? "col-span-2" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
            type="text"
            value={value}
            onChange={onChange}
            className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
    </div>
);

const InfoRow = ({ label, value }) => (
    <div className="pb-2 border-b border-gray-100 last:border-0">
        <span className="block text-sm text-gray-500 mb-1">{label}</span>
        <span className="text-gray-900 font-medium">{value}</span>
    </div>
);

export default Profile;
