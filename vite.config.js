import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        base: '/',
    publicDir: false,
    server: {
        port: 9001,
        proxy: {
            '/ontology/arches/local/api': {
                target: env.ARCHES_LOCAL_BASE_URL,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ontology\/arches\/local\/api/, '/api')
            },
            '/ontology/arches/map/api': {
                target: env.ARCHES_MAP_BASE_URL,
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/ontology\/arches\/map\/api/, '/api')
            },
            // '/arches/local/api': {
            //     target: env.ARCHES_LOCAL_BASE_URL,
            //     changeOrigin: true,
            //     rewrite: (path) => path.replace(/^\/arches\/local\/api/, '/api')
            // },
            '/arches/map/api': {
                target: env.ARCHES_MAP_BASE_URL,
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/arches\/map\/api/, '/api')
            }
        }
    }
    };
});