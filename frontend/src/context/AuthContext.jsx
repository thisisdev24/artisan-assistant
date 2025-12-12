// frontend/src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../utils/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [reauthRequired, setReauthRequired] = useState(false);

  const persistUserToStorage = (userPayload) => {
    if (!userPayload) {
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("store");
      return;
    }
    localStorage.setItem("user", JSON.stringify(userPayload));
    localStorage.setItem("role", userPayload.role);
    if (userPayload.store) {
      localStorage.setItem("store", userPayload.store);
    } else {
      localStorage.removeItem("store");
    }
  };

  const applyUser = (nextUser) => {
    setUser(nextUser);
    persistUserToStorage(nextUser);
  };

  const updateUserContext = (partialUser) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...partialUser };
      persistUserToStorage(merged);
      return merged;
    });
  };

  const persistToken = (token) => {
    if (token) {
      localStorage.setItem("token", token);
      if (typeof window !== "undefined") {
        window.__apiClientAuthToken = token;
      }
    } else {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") {
        delete window.__apiClientAuthToken;
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      // prevent refresh spam on home, login and register pages
      if (
        window.location.pathname === "/ShowListingPublic" ||
        window.location.pathname === "/search" ||
        window.location.pathname === "/contact" ||
        window.location.pathname === "/" ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/register"
      ) {
        setLoading(false);
        return;
      }

      try {
        let token = localStorage.getItem("token");
        if (token && typeof window !== "undefined") {
          window.__apiClientAuthToken = token;
        }

        // If no token, try refresh endpoint (cookie must be present)
        if (!token) {
          try {
            const resp = await apiClient.post(
              "/api/auth/refresh",
              {},
              { withCredentials: true }
            );
            token = resp.data.token;
            if (token) {
              persistToken(token);
              applyUser(resp.data.user || null);
            }
          } catch (refreshErr) {
            // no refresh -> not logged in
            console.log(refreshErr);
          }
        } else {
          // verify access token quickly
          try {
            const response = await apiClient.get("/api/auth/verify", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.valid && response.data.user) {
              applyUser(response.data.user);
            } else {
              // verify failed -> try refresh
              const resp = await apiClient.post(
                "/api/auth/refresh",
                {},
                { withCredentials: true }
              );
              const newToken = resp.data.token;
              if (newToken) {
                persistToken(newToken);
                applyUser(resp.data.user || null);
              } else {
                applyUser(null);
                persistToken(null);
              }
            }
          } catch (err) {
            // if 401 during verify, try refresh
            console.log(err);
            try {
              const resp = await apiClient.post(
                "/api/auth/refresh",
                {},
                { withCredentials: true }
              );
              const newToken = resp.data.token;
              if (newToken) {
                persistToken(newToken);
                applyUser(resp.data.user || null);
              } else {
                applyUser(null);
                persistToken(null);
              }
            } catch (refreshErr) {
              console.log(refreshErr);
              applyUser(null);
              persistToken(null);
            }
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        applyUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token, userData) => {
    persistToken(token);
    applyUser(userData);
  };

  const logout = async () => {
    try {
      // call logout endpoint to revoke refresh token
      await apiClient.post("/api/auth/logout");
    } catch (e) {
      // ignore
      console.log(e);
    }
    persistToken(null);
    localStorage.removeItem("cart"); // Clear cart on logout
    applyUser(null);
  };

  // perform reauth (password entry). returns true/false
  const performReauth = async (password) => {
    try {
      const resp = await apiClient.post("/api/auth/reauth", { password });
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
    isBuyer: user?.role === "buyer",
    isSeller: user?.role === "seller",
    isAdmin: user?.role === "admin",
    reauthRequired,
    setReauthRequired,
    performReauth,
    updateUserContext,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
