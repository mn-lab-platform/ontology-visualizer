import { apiFetch } from '../api.js';
import {
    fitUsageGraph,
    renderUsageGraph,
    runUsageLayout,
    saveCurrentUsageLayout,
    resetCurrentUsageLayout
} from './graph.js';
const usageState = {
    models: [],
    graph: null
};

function getElements() {
    return {
        modelSelect: document.getElementById('model-select'),
        loadGraphButton: document.getElementById('load-graph'),
        summary: document.getElementById('graph-summary'),
    };
}

function fillModelSelect(models) {
    const { modelSelect } = getElements();

    modelSelect.innerHTML = '';

    models.forEach((model) => {
        const option = document.createElement('option');

        option.value = model.graphid;
        option.textContent = model.subtitle
            ? `${model.name} - ${model.subtitle}`
            : model.name;

        modelSelect.appendChild(option);
    });
}

async function loadModels() {
    const { modelSelect, summary } = getElements();

    modelSelect.innerHTML = '<option value="">Loading models...</option>';

    const data = await apiFetch('/api/ontology-usage/models');

    usageState.models = data.models || [];
    fillModelSelect(usageState.models);

    summary.textContent = `Loaded ${usageState.models.length} resource models.`;
}

async function loadSelectedGraph() {
    const { modelSelect, summary } = getElements();
    const graphId = modelSelect.value;

    if (!graphId) {
        summary.textContent = 'Choose a model first.';
        return;
    }

    summary.textContent = 'Loading graph...';

    const graph = await apiFetch(`/api/ontology-usage/models/${graphId}`);

    usageState.graph = graph;

    summary.textContent =
        `${graph.model.name}: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ` +
        `${graph.classUsage.length} classes, ${graph.propertyUsage.length} properties.`;

    renderUsageGraph(graph);
}

export function initUsageView() {
    const { loadGraphButton, summary } = getElements();

    loadGraphButton.addEventListener('click', () => {
        loadSelectedGraph().catch((error) => {
            summary.textContent = error.message;
            console.error('[OntologyUsage] graph load failed', error);
        });
    });

    loadModels().catch((error) => {
        summary.textContent = error.message;
        console.error('[OntologyUsage] models load failed', error);
    });
    document.getElementById('fit-graph').addEventListener('click', fitUsageGraph);
    document.getElementById('run-layout').addEventListener('click', runUsageLayout);
    document.getElementById('save-layout').addEventListener('click', saveCurrentUsageLayout);
    document.getElementById('reset-layout').addEventListener('click', resetCurrentUsageLayout);
}