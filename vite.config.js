export default {
    publicDir: false,
    server: {
        port: 9001,
        proxy: {
            '/arches/local/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/arches\/local\/api/, '/api')
            },
            '/arches/dev/api': {
                target: 'https://dev.mn.cenagis.edu.pl',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/arches\/dev\/api/, '/api')
            }
        }
    }
};