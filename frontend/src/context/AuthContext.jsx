import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Initialize user from localStorage immediately to prevent flash
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    // Check if user is authenticated on mount and verify token
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');

                // If no token, clear everything
                if (!token) {
                    setUser(null);
                    localStorage.removeItem('user');
                    localStorage.removeItem('role');
                    setLoading(false);
                    return;
                }

                // If we have stored user data, set it immediately (optimistic)
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                    } catch (e) {
                        // Invalid stored data, continue to verify
                    }
                }

                // Verify token with backend
                try {
                    const response = await apiClient.get('/api/auth/verify', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (response.data.valid && response.data.user) {
                        setUser(response.data.user);
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        localStorage.setItem('role', response.data.user.role);
                    } else {
                        // Token invalid, clear everything
                        setUser(null);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('role');
                    }
                } catch (verifyErr) {
                    // If verify fails (network error, etc.), but we have a token and stored user,
                    // keep the user logged in (they might be offline or server is temporarily down)
                    // Only clear if it's a 401 (unauthorized)
                    if (verifyErr.response?.status === 401) {
                        setUser(null);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('role');
                    }
                    // Otherwise, keep the user logged in with stored data
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                // Only clear on critical errors
                if (err.response?.status === 401) {
                    setUser(null);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('role');
                }
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

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('cart'); // Clear cart on logout
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isBuyer: user?.role === 'buyer',
        isSeller: user?.role === 'seller',
        isAdmin: user?.role === 'admin'
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

