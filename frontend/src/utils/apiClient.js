import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5000',
});

// Add a request interceptor to attach device and network info
apiClient.interceptors.request.use((config) => {
    // Network Info
    if (navigator.connection) {
        const conn = navigator.connection;
        config.headers['x-network-type'] = conn.type || 'unknown';
        config.headers['x-network-effective-type'] = conn.effectiveType || 'unknown';
        config.headers['x-network-downlink'] = conn.downlink || 0;
        config.headers['x-network-rtt'] = conn.rtt || 0;
        config.headers['x-network-save-data'] = conn.saveData ? 'true' : 'false';
    }

    // Device Info (basic)
    config.headers['x-device-memory'] = navigator.deviceMemory || 0;
    config.headers['x-device-platform'] = navigator.platform || 'unknown';
    config.headers['x-device-hardware-concurrency'] = navigator.hardwareConcurrency || 0;

    // Timezone
    config.headers['x-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Auth Token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

export default apiClient;
