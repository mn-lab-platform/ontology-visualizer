export function getElements() {
    return {
        modelSelect: document.getElementById('maxgraph-model-select'),
        loadButton: document.getElementById('maxgraph-load'),
        fitButton: document.getElementById('maxgraph-fit'),
        layoutButton: document.getElementById('maxgraph-layout'),
        alignLeftButton: document.getElementById('maxgraph-align-left'),
        alignTopButton: document.getElementById('maxgraph-align-top'),
        exportButton: document.getElementById('maxgraph-export'),
        summary: document.getElementById('maxgraph-summary'),
        status: document.getElementById('maxgraph-status'),
        output: document.getElementById('maxgraph-output'),
        container: document.getElementById('maxgraph-diagram'),
        details: document.getElementById('maxgraph-details')
    };
}

export function setStatus(message) {
    const { status } = getElements();

    if (status) {
        status.textContent = message;
    }
}

export function setSummary(message) {
    const { summary } = getElements();

    if (summary) {
        summary.textContent = message;
    }
}
