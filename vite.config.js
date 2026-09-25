import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const allowedHosts = env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",").map((host) => host.trim()).filter(Boolean)
        : [];

    return {
        base: '/',
    publicDir: false,
    server: {
        port: 9001,
        allowedHosts,
        proxy: {
            '/layout-api': {
                target: env.LAYOUT_API_PROXY_TARGET || 'http://layout-api:9002',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/layout-api/, '')
            },
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