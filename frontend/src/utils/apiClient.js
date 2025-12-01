// src/utils/apiClient.js
import axios from "axios";
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000" });

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

export default apiClient;
