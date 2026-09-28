export function getElements() {
    return {
        modelSelect: document.getElementById('maxgraph-model-select'),
        loadButton: document.getElementById('maxgraph-load'),
        fitButton: document.getElementById('maxgraph-fit'),
        layoutButton: document.getElementById('maxgraph-layout'),
        alignLeftButton: document.getElementById('maxgraph-align-left'),
        alignTopButton: document.getElementById('maxgraph-align-top'),
        alignRightButton: document.getElementById('maxgraph-align-right'),
        alignBottomButton: document.getElementById('maxgraph-align-bottom'),
        exportButton: document.getElementById('maxgraph-export'),
        searchToggle: document.getElementById('maxgraph-search-toggle'),
        search: document.getElementById('maxgraph-search'),
        searchInput: document.getElementById('maxgraph-search-input'),
        searchResults: document.getElementById('maxgraph-search-results'),
        summary: document.getElementById('maxgraph-summary'),
        status: document.getElementById('maxgraph-status'),
        container: document.getElementById('maxgraph-diagram'),
        details: document.getElementById('maxgraph-details')
    };
}

function setMessage(element, message, type = '') {
    if (!element) {
        return;
    }

    element.textContent = message;
    const messageType = type || (message ? 'info' : '');

    if (messageType) {
        element.dataset.state = messageType;
    } else {
        delete element.dataset.state;
    }
}

export function setStatus(message, type = '') {
    const { status } = getElements();

    setMessage(status, message, type);
}

export function setSummary(message, type = '') {
    const { summary } = getElements();

    setMessage(summary, message, type);
}
