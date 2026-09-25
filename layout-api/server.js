import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number.parseInt(process.env.PORT || '9002', 10);
const layoutsDirectory = path.resolve(process.env.LAYOUTS_DIR || '/data/layouts');
const maxBodyBytes = 5 * 1024 * 1024;
const safePathPart = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    response.end(`${JSON.stringify(payload)}\n`);
}

function getLayoutFile(pathname) {
    const match = pathname.match(/^\/layouts\/([^/]+)\/([^/]+)$/);

    if (!match) {
        return null;
    }

    const provider = decodeURIComponent(match[1]);
    const resourceId = decodeURIComponent(match[2]);

    if (!safePathPart.test(provider) || !safePathPart.test(resourceId)) {
        throw new Error('Provider and resource ID may contain only letters, digits, dots, hyphens, and underscores.');
    }

    return {
        provider,
        resourceId,
        filePath: path.join(layoutsDirectory, provider, `${resourceId}.json`)
    };
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];

        request.on('data', (chunk) => {
            size += chunk.length;

            if (size > maxBodyBytes) {
                reject(new Error('Layout payload exceeds 5 MB.'));
                request.destroy();
                return;
            }

            chunks.push(chunk);
        });
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', reject);
    });
}

async function readLayout(response, layoutFile) {
    try {
        const contents = await readFile(layoutFile.filePath, 'utf8');
        const layout = JSON.parse(contents);

        sendJson(response, 200, { layout });
    } catch (error) {
        if (error.code === 'ENOENT') {
            sendJson(response, 404, { error: 'Layout not found.' });
            return;
        }

        if (error instanceof SyntaxError) {
            sendJson(response, 500, { error: 'Saved layout is not valid JSON.' });
            return;
        }

        throw error;
    }
}

async function saveLayout(request, response, layoutFile) {
    const body = await readRequestBody(request);
    let payload;

    try {
        payload = JSON.parse(body);
    } catch {
        sendJson(response, 400, { error: 'Request body must be valid JSON.' });
        return;
    }

    if (!payload?.layout || typeof payload.layout !== 'object' || Array.isArray(payload.layout)) {
        sendJson(response, 400, { error: 'Request body must include a layout object.' });
        return;
    }

    const directory = path.dirname(layoutFile.filePath);
    const temporaryFile = path.join(directory, `.${layoutFile.resourceId}.${randomUUID()}.tmp`);
    const layout = {
        ...payload.layout,
        savedAt: new Date().toISOString(),
        provider: layoutFile.provider,
        resourceId: layoutFile.resourceId
    };

    await mkdir(directory, { recursive: true });

    try {
        await writeFile(temporaryFile, `${JSON.stringify(layout, null, 2)}\n`, 'utf8');
        await rename(temporaryFile, layoutFile.filePath);
    } finally {
        await rm(temporaryFile, { force: true });
    }

    sendJson(response, 200, {
        savedAt: layout.savedAt,
        provider: layoutFile.provider,
        resourceId: layoutFile.resourceId
    });
}

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

        if (request.method === 'GET' && url.pathname === '/health') {
            sendJson(response, 200, { status: 'ok' });
            return;
        }

        const layoutFile = getLayoutFile(url.pathname);

        if (!layoutFile) {
            sendJson(response, 404, { error: 'Unknown endpoint.' });
            return;
        }

        if (request.method === 'GET') {
            await readLayout(response, layoutFile);
            return;
        }

        if (request.method === 'PUT') {
            await saveLayout(request, response, layoutFile);
            return;
        }

        response.writeHead(405, { Allow: 'GET, PUT' });
        response.end();
    } catch (error) {
        console.error('[Layout API] request failed', error);
        sendJson(response, 500, { error: 'Unable to process layout request.' });
    }
});

server.listen(port, () => {
    console.log(`[Layout API] listening on port ${port}; layouts directory: ${layoutsDirectory}`);
});
