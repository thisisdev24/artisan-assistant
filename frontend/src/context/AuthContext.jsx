// frontend/src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [reauthRequired, setReauthRequired] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            // prevent refresh spam on login page
            if (window.location.pathname === "/login" || window.location.pathname === "/register") {
                setLoading(false);
                return;
            }

            try {
                let token = localStorage.getItem('token');

                // If no token, try refresh endpoint (cookie must be present)
                if (!token) {
                    try {
                        const resp = await apiClient.post('/api/auth/refresh', {}, { withCredentials: true });
                        token = resp.data.token;
                        if (token) {
                            localStorage.setItem('token', token);
                            setUser(resp.data.user || null);
                            if (resp.data.user) {
                                localStorage.setItem('user', JSON.stringify(resp.data.user));
                                localStorage.setItem('role', resp.data.user.role);
                            }
                        }
                    } catch (refreshErr) {
                        // no refresh -> not logged in
                        console.log(refreshErr);
                    }
                } else {
                    // verify access token quickly
                    try {
                        const response = await apiClient.get('/api/auth/verify', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (response.data.valid && response.data.user) {
                            setUser(response.data.user);
                            localStorage.setItem('user', JSON.stringify(response.data.user));
                            localStorage.setItem('role', response.data.user.role);
                        } else {
                            // verify failed -> try refresh
                            const resp = await apiClient.post('/api/auth/refresh', {}, { withCredentials: true });
                            const newToken = resp.data.token;
                            if (newToken) {
                                localStorage.setItem('token', newToken);
                                setUser(resp.data.user || null);
                                if (resp.data.user) {
                                    localStorage.setItem('user', JSON.stringify(resp.data.user));
                                    localStorage.setItem('role', resp.data.user.role);
                                }
                            } else {
                                setUser(null);
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                localStorage.removeItem('role');
                            }
                        }
                    } catch (err) {
                        // if 401 during verify, try refresh
                        console.log(err);
                        try {
                            const resp = await apiClient.post('/api/auth/refresh', {}, { withCredentials: true });
                            const newToken = resp.data.token;
                            if (newToken) {
                                localStorage.setItem('token', newToken);
                                setUser(resp.data.user || null);
                                if (resp.data.user) {
                                    localStorage.setItem('user', JSON.stringify(resp.data.user));
                                    localStorage.setItem('role', resp.data.user.role);
                                }
                            } else {
                                setUser(null);
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                localStorage.removeItem('role');
                            }
                        } catch (refreshErr) {
                            console.log(refreshErr);
                            setUser(null);
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            localStorage.removeItem('role');
                        }
                    }
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', userData.role);
        setUser(userData);
    };

    const logout = async () => {
        try {
            // call logout endpoint to revoke refresh token
            await apiClient.post('/api/auth/logout');
        } catch (e) {
            // ignore
            console.log(e);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('cart'); // Clear cart on logout
        setUser(null);
    };

    // perform reauth (password entry). returns true/false
    const performReauth = async (password) => {
        try {
            const resp = await apiClient.post('/api/auth/reauth', { password });
            if (resp.data && resp.data.ok) {
                setReauthRequired(false);
                return true;
            }
            return false;
        } catch (err) {
            console.log(err);
            return false;
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isBuyer: user?.role === 'buyer',
        isSeller: user?.role === 'seller',
        isAdmin: user?.role === 'admin',
        reauthRequired,
        setReauthRequired,
        performReauth
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
