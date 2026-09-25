import { getActiveArchesId } from '../arches-instances.js';

function layoutUrl(graphId) {
    return `/layout-api/layouts/${encodeURIComponent(getActiveArchesId())}/${encodeURIComponent(graphId)}`;
}

async function getResponseBody(response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return {};
    }
}

export async function loadStoredLayout(graphId) {
    const response = await fetch(layoutUrl(graphId), { credentials: 'same-origin' });

    if (response.status === 404) {
        return null;
    }

    const body = await getResponseBody(response);

    if (!response.ok) {
        throw new Error(body.error || `Layout load failed (${response.status}).`);
    }

    return body.layout || null;
}

export async function saveStoredLayout(graphId, layout) {
    const response = await fetch(layoutUrl(graphId), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout })
    });
    const body = await getResponseBody(response);

    if (!response.ok) {
        throw new Error(body.error || `Layout save failed (${response.status}).`);
    }

    return body;
}
