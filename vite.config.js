export default {
    base: '/ontology/',
    publicDir: false,
    server: {
        port: 9001,
        proxy: {
            '/ontology/arches/local/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ontology\/arches\/local\/api/, '/api')
            },
            '/ontology/arches/dev/api': {
                target: 'https://dev.mn.cenagis.edu.pl',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/ontology\/arches\/dev\/api/, '/api')
            },
            // '/arches/local/api': {
            //     target: 'http://localhost:8000',
            //     changeOrigin: true,
            //     rewrite: (path) => path.replace(/^\/arches\/local\/api/, '/api')
            // },
            '/arches/dev/api': {
                target: 'https://dev.mn.cenagis.edu.pl',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/arches\/dev\/api/, '/api')
            }
        }
    }
};