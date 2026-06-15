import { initUsageView } from './usage/u-view.js';
import {
    ARCHES_INSTANCES,
    getActiveArches,
    getActiveArchesId,
    setActiveArchesId
} from './arches-instances.js';
function setActiveView(viewName) {
    document.querySelectorAll('.app__tab').forEach((button) => {
        button.classList.toggle('app__tab--active', button.dataset.view === viewName);
    });

    document.getElementById('usage-view').classList.toggle('app__view--hidden', viewName !== 'usage');
    document.getElementById('cidoc-view').classList.toggle('app__view--hidden', viewName !== 'cidoc');
}

document.querySelectorAll('.app__tab').forEach((button) => {
    button.addEventListener('click', () => {
        setActiveView(button.dataset.view);
    });
});
async function registerCidocAdapter() {
    if (!('serviceWorker' in navigator)) {
        console.warn('[CIDOCAdapter] service worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/cidoc-periodic-adapter-sw.js', {
            scope: '/'
        });

        await navigator.serviceWorker.ready;

        console.log('[CIDOCAdapter] registered', registration.scope);
        return registration;
    } catch (error) {
        console.error('[CIDOCAdapter] registration failed', error);
        return null;
    }
}
function initArchesPicker() {
    const select = document.getElementById('arches-instance-select');

    select.innerHTML = '';

    ARCHES_INSTANCES.forEach((instance) => {
        const option = document.createElement('option');

        option.value = instance.id;
        option.textContent = instance.label;

        select.appendChild(option);
    });

    select.value = getActiveArchesId();

    select.addEventListener('change', () => {
        setActiveArchesId(select.value);
        window.location.reload();
    });
}
async function initCidocFrame() {
    const registration = await registerCidocAdapter();
    const activeArches = getActiveArches();
    const worker = registration?.active || navigator.serviceWorker.controller;

    if (worker) {
        worker.postMessage({
            type: 'SET_ARCHES_API_PREFIX',
            apiPrefix: activeArches.apiPrefix
        });
    }

    const frame = document.getElementById('cidoc-frame');

    if (frame) {
        frame.src = `/cidoc-periodic-table/index.html?arches=${activeArches.id}`;
    }
}
initArchesPicker();
initUsageView();
initCidocFrame();