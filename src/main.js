import { initUsageView } from './usage/u-view.js';

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
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/cidoc-periodic-adapter-sw.js', {
            scope: '/'
        });

        await navigator.serviceWorker.ready;

        console.log('[CIDOCAdapter] registered', registration.scope);
    } catch (error) {
        console.error('[CIDOCAdapter] registration failed', error);
    }
}

registerCidocAdapter();
initUsageView();