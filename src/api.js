import { getActiveArches } from './arches-instances.js';

export async function apiFetch(path, options = {}) {
    const activeArches = getActiveArches();
    const normalizedPath = path.startsWith('/api/')
        ? path.replace('/api', activeArches.apiPrefix)
        : `${activeArches.apiPrefix}${path}`;

    const response = await fetch(normalizedPath, {
        credentials: 'include',
        ...options
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return response.json();
}