import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Suppress console errors for proxy connection issues
const originalError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  // Filter out proxy connection errors
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('AggregateError') ||
    message.includes('http proxy error') ||
    message.includes('/api/logs/ingest')
  ) {
    return; // Silently ignore
  }
  originalError.apply(console, args);
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 5000,
        // Completely suppress connection errors
        configure: (proxy, _options) => {
          // Suppress all proxy errors silently
          proxy.on('error', (err, req, res) => {
            // Silently handle all connection-related errors
            const connectionErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EPIPE'];
            const isConnectionError = connectionErrors.includes(err.code) ||
              err.message?.includes('ECONNREFUSED') ||
              err.message?.includes('AggregateError') ||
              err.name === 'AggregateError';

            if (isConnectionError) {
              // Silently handle - backend is not available
              if (res && !res.headersSent) {
                try {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Service unavailable' }));
                } catch (e) {
                  // Response already sent or closed - ignore
                }
              }
              return; // Don't log or throw - completely silent
            }
          });
        },
        ws: true
      }
    }
  },
  logLevel: 'warn'
})
