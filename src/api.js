import { getActiveArches } from "./arches-instances.js";

function appPath(path) {
    if (/^https?:\/\//.test(path)) {
        return path;
    }

    const activeArches = getActiveArches();
    const apiPath = path.startsWith("/api/")
        ? path.replace("/api", activeArches.apiPrefix)
        : path.startsWith(activeArches.apiPrefix)
            ? path
            : `${activeArches.apiPrefix}/${path.replace(/^\/+/, "")}`;

    const baseUrl = import.meta.env.BASE_URL || "/";

    return apiPath.startsWith("/")
        ? `${baseUrl}${apiPath.slice(1)}`
        : `${baseUrl}${apiPath}`;
}

export async function apiFetch(path, options = {}) {
    const response = await fetch(appPath(path), {
        credentials: "include",
        ...options
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return response.json();
}
