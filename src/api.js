export async function apiFetch(path, options = {}) {
    const response = await fetch(path, {
        credentials: 'include',
        ...options
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return response.json();
}