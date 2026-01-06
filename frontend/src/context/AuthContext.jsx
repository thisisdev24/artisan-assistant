// frontend/src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect, useRef } from "react";
import apiClient from "../utils/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const mountedRef = useRef(true);
  const toastTimerRef = useRef(null);

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

  // New: session-expired toast state
  const [showSessionExpiredToast, setShowSessionExpiredToast] = useState(false);

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
    if (!mountedRef.current) return;
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
      try { localStorage.setItem('__token_updated_at', Date.now().toString()); } catch (e) { console.log(e); }
    } else {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") {
        delete window.__apiClientAuthToken;
      }
      try { localStorage.setItem('__token_updated_at', Date.now().toString()); } catch (e) { console.log(e); }
    }
  };

  // Graceful logout used by app (and by the global event handler)
  const logout = async (opts = { redirect: true }) => {
    try {
      // try to revoke server side refresh token (best-effort)
      await apiClient.post("/api/auth/logout");
    } catch (e) {
      console.log("Logout endpoint failed:", e);
    }
    persistToken(null);
    localStorage.removeItem("cart"); // Clear cart on logout
    applyUser(null);

    if (opts.redirect) {
      // navigate to login
      try {
        window.location.href = "/login";
      } catch (e) {
        console.log(e);
      }
    }
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

  // New: show session-expired toast then redirect after short delay.
  const handleSessionExpiry = () => {
    // Clear tokens & user immediately so components stop making protected requests
    persistToken(null);
    applyUser(null);

    // show toast
    setShowSessionExpiredToast(true);

    // Clear any previous timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    // redirect after 2.5s
    toastTimerRef.current = setTimeout(() => {
      setShowSessionExpiredToast(false);
      try { window.location.href = "/login"; } catch (e) { console.log(e); }
    }, 2500);
  };

  // Close toast now and redirect immediately (used when user clicks button)
  const closeSessionExpiredToastNow = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setShowSessionExpiredToast(false);
    try { window.location.href = "/login"; } catch (e) { console.log(e); }
  };

  // The main auth-check — run once at mount (not on every render)
  useEffect(() => {
    mountedRef.current = true;
    const checkAuth = async () => {
      // prevent refresh spam on common public pages
      if (
        window.location.pathname === "/ShowListingPublic" ||
        window.location.pathname === "/search" ||
        window.location.pathname === "/contact" ||
        window.location.pathname === "/" ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/register" ||
        window.location.pathname.startsWith("/products/")
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
            const newToken = resp.data.token;
            if (newToken) {
              persistToken(newToken);
              applyUser(resp.data.user || null);
            } else {
              // ensure cleared
              persistToken(null);
              applyUser(null);
            }
          } catch (refreshErr) {
            console.log(refreshErr);
            // not logged in
            persistToken(null);
            applyUser(null);
            //console.log("Refresh failed", refreshErr);
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
          } catch (err) {
            console.log(err);
            // if 401 during verify, try refresh
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
        persistToken(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    checkAuth();

    // React to global logout events (fired by apiClient when refresh fails)
    const onGlobalLogout = () => {
      // Instead of calling logout which redirects immediately,
      // show the session-expired toast then redirect after a short delay
      handleSessionExpiry();
    };
    window.addEventListener("app:auth_logout", onGlobalLogout);

    // React to token changes from other tabs (cross-tab logout/login)
    const onStorage = (e) => {
      if (e.key === "token" && !e.newValue) {
        // another tab logged out or token removed
        handleSessionExpiry();
      }
      // detect token rotation in other tabs
      if (e.key === "__token_updated_at") {
        const t = localStorage.getItem("token");
        if (!t) {
          handleSessionExpiry();
        }
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("app:auth_logout", onGlobalLogout);
      window.removeEventListener("storage", onStorage);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []); // <-- important: run *once* on mount

  // Also expose a small API
  const value = {
    user,
    loading,
    login: (token, userData) => {
      persistToken(token);
      applyUser(userData);
    },
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

  return (
    <>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

      {/* Session-expired toast (Tailwind) */}
      {showSessionExpiredToast && (
        <div
          className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center px-4 py-6"
          aria-live="assertive"
        >
          <div className="pointer-events-auto w-full max-w-sm">
            <div className="rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Session expired</p>
                  <p className="mt-1 text-sm text-gray-600">Your session expired — please log in again.</p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={closeSessionExpiredToastNow}
                    className="ml-3 inline-flex rounded-md bg-transparent px-2 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};