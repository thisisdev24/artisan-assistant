import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate("/login");
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/");
    };

    if (!user) {
        return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
    }

    return (
        <>
            {/* <Navbar /> */}
            <div className="min-h-screen bg-gray-100 py-10 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="bg-primary p-6 text-white text-center">
                        <h1 className="text-3xl font-bold">Profile</h1>
                        <p className="text-sm opacity-80">Manage your account details</p>
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col gap-6">

                            {/* Common Details */}
                            <div className="border-b pb-4">
                                <h2 className="text-xl font-semibold text-gray-800 mb-2">Personal Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-sm text-gray-500">Name</span>
                                        <span className="text-lg font-medium text-gray-900">{user.user.name}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm text-gray-500">Email</span>
                                        <span className="text-lg font-medium text-gray-900">{user.user.email}</span>
                                    </div>
                                    <div>
                                        <span className="block text-sm text-gray-500">Role</span>
                                        <span className="text-lg font-medium text-gray-900 capitalize">{user.user.role}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Role Specific Details */}
                            {user.user.role === 'seller' && (
                                <div className="border-b pb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Store Details</h2>
                                    <div>
                                        <span className="block text-sm text-gray-500">Store Name</span>
                                        <span className="text-lg font-medium text-gray-900">{user.user.store}</span>
                                    </div>
                                </div>
                            )}

                            {user.user.role === 'admin' && (
                                <div className="border-b pb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin Controls</h2>
                                    <p className="text-gray-600">You have administrative privileges.</p>
                                    {/* Link to Admin Dashboard if it exists */}
                                    {/* <Link to="/admin" className="text-primary hover:underline mt-2 block">Go to Admin Dashboard</Link> */}
                                </div>
                            )}

                            {/* Logout Button */}
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-colors font-semibold"
                                >
                                    Logout
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
