export default {
    server: {
        port: 9001,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            '/static': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
};