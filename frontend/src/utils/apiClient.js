// frontend/src/utils/apiClient.js
import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const apiClient = axios.create({ baseURL, withCredentials: true });

// request: attach access token from localStorage
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem("token") || window.__apiClientAuthToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // network headers
    if (navigator.connection) {
        const c = navigator.connection;
        config.headers["x-network-type"] = c.type || "";
        config.headers["x-network-effective-type"] = c.effectiveType || "";
        config.headers["x-network-rtt"] = c.rtt || 0;
    }
    config.headers["x-timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return config;
});

// helper to call refresh endpoint (returns new token or throws)
async function refreshAccessToken() {
    try {
        const resp = await axios.post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true });
        const token = resp.data?.token;
        if (token) {
            localStorage.setItem("token", token);
            // also store on window for immediate subsequent requests
            window.__apiClientAuthToken = token;
        }
        return token;
    } catch (err) {
        // refresh failed
        localStorage.removeItem("token");
        delete window.__apiClientAuthToken;
        throw err;
    }
}

// response interceptor: try refresh on 401 once
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
    refreshQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    refreshQueue = [];
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest) return Promise.reject(error);

        // ⛔ DO NOT refresh on login/register/reauth routes
        const skipRefreshPaths = [
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/reauth",
            "/api/auth/logout",
        ];

        const reqUrl = originalRequest.url || "";
        if (skipRefreshPaths.some(p => reqUrl.includes(p))) {
            return Promise.reject(error);
        }

        // ⛔ If server says reauth required for sensitive actions
        if (
            error.response &&
            error.response.status === 401 &&
            error.response.data?.need_reauth
        ) {
            // Let the frontend show reauth modal
            return Promise.reject(error);
        }

        // If 401 and not retried yet → automatically refresh
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Queue refresh if multiple requests happen at once
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers["Authorization"] = `Bearer ${token}`;
                    return axios(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            isRefreshing = true;
            try {
                const newToken = await refreshAccessToken();
                processQueue(null, newToken);
                originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
                return axios(originalRequest);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem("token");
                window.location.href = "/login";
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
