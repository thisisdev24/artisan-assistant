import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const initialForm = {
    name: '',
    store: '',
    store_description: '',
    store_logo: '',
    store_banner: '',
    address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
    },
    identity_card: {
        type: '',
        number: '',
        document_url: '',
        expires_at: '',
        verified: false
    },
    profile_details: {
        bio: '',
        years_of_experience: 0,
        specialties: []
    }
};

const SellerProfile = () => {
    const navigate = useNavigate();
    const { updateUserContext } = useAuth();
    const [profile, setProfile] = useState(null);
    const [formState, setFormState] = useState(initialForm);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const mapProfileToForm = (data) => ({
        name: data.name || '',
        store: data.store || '',
        store_description: data.store_description || '',
        store_logo: data.store_logo || '',
        store_banner: data.store_banner || '',
        address: {
            line1: data.address?.line1 || '',
            line2: data.address?.line2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            postal_code: data.address?.postal_code || '',
            country: data.address?.country || ''
        },
        identity_card: {
            type: data.identity_card?.type || '',
            number: data.identity_card?.number || '',
            document_url: data.identity_card?.document_url || '',
            expires_at: data.identity_card?.expires_at ? new Date(data.identity_card.expires_at).toISOString().slice(0, 10) : '',
            verified: data.identity_card?.verified || false
        },
        profile_details: {
            bio: data.profile_details?.bio || '',
            years_of_experience: data.profile_details?.years_of_experience || 0,
            specialties: data.profile_details?.specialties || []
        }
    });

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/api/artisans/me');
            setProfile(response.data);
            setFormState(mapProfileToForm(response.data));
        } catch (err) {
            console.error('Failed to load seller profile', err);
            setError(err?.response?.data?.message || 'Failed to load seller profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFieldChange = (section, field, value) => {
        setFormState(prev => {
            if (!section) {
                return { ...prev, [field]: value };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
        });
    };

    const handleSpecialtiesChange = (value) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
        setFormState(prev => ({
            ...prev,
            profile_details: { ...prev.profile_details, specialties: tags }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccess('');
            setError(null);
            const payload = {
                ...formState,
                profile_details: {
                    ...formState.profile_details,
                    years_of_experience: Number(formState.profile_details.years_of_experience || 0)
                }
            };
            const response = await apiClient.put('/api/artisans/me', payload);
            setProfile(response.data.artisan);
            setFormState(mapProfileToForm(response.data.artisan));
            setEditing(false);
            setSuccess('Profile updated successfully.');
            updateUserContext({
                name: response.data.artisan.name,
                store: response.data.artisan.store
            });
        } catch (err) {
            console.error('Profile update failed', err);
            setError(err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const importantDocuments = useMemo(() => {
        if (!profile?.documents || profile.documents.length === 0) return [];
        return profile.documents;
    }, [profile]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
                Loading your profile...
            </div>
        );
    }

    if (error && !editing && !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error}</p>
                <button onClick={loadProfile} className="bg-indigo-600 text-white px-5 py-2 rounded-lg">Retry</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Seller Profile</h1>
                        <p className="text-gray-500 text-sm mt-1">Keep your business details up to date for faster verification.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setEditing(prev => !prev)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold"
                        >
                            {editing ? 'Cancel Editing' : 'Edit Details'}
                        </button>
                        <button
                            onClick={() => navigate('/Seller')}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg font-semibold"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={loadProfile} className="text-sm underline font-semibold">
                            Reload
                        </button>
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-6">
                        {success}
                    </div>
                )}

                <div className="grid gap-6">
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Details</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputField
                                label="Full Name"
                                value={formState.name}
                                onChange={(e) => handleFieldChange(null, 'name', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Store Name"
                                value={formState.store}
                                onChange={(e) => handleFieldChange(null, 'store', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Store Logo URL"
                                value={formState.store_logo}
                                onChange={(e) => handleFieldChange(null, 'store_logo', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Store Banner URL"
                                value={formState.store_banner}
                                onChange={(e) => handleFieldChange(null, 'store_banner', e.target.value)}
                                disabled={!editing}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Store Description</label>
                            <textarea
                                value={formState.store_description}
                                onChange={(e) => handleFieldChange(null, 'store_description', e.target.value)}
                                disabled={!editing}
                                className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                                rows={4}
                                placeholder="Tell buyers more about your store"
                            />
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Address</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputField
                                label="Address Line 1"
                                value={formState.address.line1}
                                onChange={(e) => handleFieldChange('address', 'line1', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Address Line 2"
                                value={formState.address.line2}
                                onChange={(e) => handleFieldChange('address', 'line2', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="City"
                                value={formState.address.city}
                                onChange={(e) => handleFieldChange('address', 'city', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="State"
                                value={formState.address.state}
                                onChange={(e) => handleFieldChange('address', 'state', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Postal Code"
                                value={formState.address.postal_code}
                                onChange={(e) => handleFieldChange('address', 'postal_code', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Country"
                                value={formState.address.country}
                                onChange={(e) => handleFieldChange('address', 'country', e.target.value)}
                                disabled={!editing}
                            />
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Identity Card</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${formState.identity_card.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {formState.identity_card.verified ? 'Verified' : 'Pending Verification'}
                            </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputField
                                label="Document Type"
                                value={formState.identity_card.type}
                                onChange={(e) => handleFieldChange('identity_card', 'type', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Document Number"
                                value={formState.identity_card.number}
                                onChange={(e) => handleFieldChange('identity_card', 'number', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Expiry Date"
                                type="date"
                                value={formState.identity_card.expires_at}
                                onChange={(e) => handleFieldChange('identity_card', 'expires_at', e.target.value)}
                                disabled={!editing}
                            />
                            <InputField
                                label="Document Link"
                                value={formState.identity_card.document_url}
                                onChange={(e) => handleFieldChange('identity_card', 'document_url', e.target.value)}
                                disabled={!editing}
                            />
                        </div>
                        {formState.identity_card.document_url && (
                            <a
                                href={formState.identity_card.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 text-sm font-medium mt-3 inline-flex items-center gap-2"
                            >
                                View uploaded document ↗
                            </a>
                        )}
                    </section>

                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">About & Experience</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Bio</label>
                                <textarea
                                    value={formState.profile_details.bio}
                                    onChange={(e) => handleFieldChange('profile_details', 'bio', e.target.value)}
                                    disabled={!editing}
                                    rows={4}
                                    className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                                    placeholder="Share your story, techniques or certifications."
                                />
                            </div>
                            <div className="space-y-4">
                                <InputField
                                    label="Years of Experience"
                                    type="number"
                                    value={formState.profile_details.years_of_experience}
                                    onChange={(e) => handleFieldChange('profile_details', 'years_of_experience', e.target.value)}
                                    disabled={!editing}
                                />
                                <InputField
                                    label="Specialties (comma separated)"
                                    value={formState.profile_details.specialties.join(', ')}
                                    onChange={(e) => handleSpecialtiesChange(e.target.value)}
                                    disabled={!editing}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Documents & Other Details</h2>
                        </div>
                        {importantDocuments.length === 0 ? (
                            <p className="text-gray-500">No documents uploaded yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {importantDocuments.map(doc => (
                                    <div key={doc._id || doc.type} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-800 capitalize">{doc.type?.replace('_', ' ')}</p>
                                            <p className="text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${doc.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {doc.status || 'in_review'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {editing && (
                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            onClick={() => setEditing(false)}
                            className="px-5 py-3 rounded-lg border text-gray-700 hover:bg-gray-100 transition"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-60"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const InputField = ({ label, type = 'text', value, onChange, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
        />
    </div>
);

export default SellerProfile;

