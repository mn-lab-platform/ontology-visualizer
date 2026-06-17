import { apiFetch } from '../api.js';
import { getElements, setStatus, setSummary } from './elements.js';
import { exportLayout } from './export-layout.js';
import { createGraphInstance, ensureScrollableWorkspace } from './graph-config.js';
import {
    buildChildrenMap,
    buildEdgeSlots,
    getNodePosition,
    getNodeSize,
    getNodeSubtitle,
    getNodeTitle,
    getNodeTreeHeight
} from './graph-data.js';
import { getEdgeStyle, getNodeStyle } from './graph-styles.js';
import { renderNodeTitleLabels } from './labels.js';
import { alignSelection, applySavedEdgeLayout, fitGraph, runLayout } from './layout.js';
import { state } from './state.js';

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
    const { modelSelect } = getElements();

    modelSelect.innerHTML = '<option value="">Loading models...</option>';

    const data = await apiFetch('/api/ontology-usage/models');

    state.models = data.models || [];
    fillModelSelect(state.models);
    setSummary(`Loaded ${state.models.length} resource models.`);
}

function renderMaxgraph(rawGraph) {
    const graph = createGraphInstance();
    const parent = graph.getDefaultParent();
    const childrenMap = buildChildrenMap(rawGraph.edges || []);
    const edgeSlots = buildEdgeSlots(rawGraph.edges || []);
    const heightById = new Map();

    state.rawGraph = rawGraph;
    state.edgeSlots = edgeSlots;

    (rawGraph.nodes || []).forEach((node) => {
        getNodeTreeHeight(node.id, childrenMap, heightById);
    });

    graph.batchUpdate(() => {
        (rawGraph.nodes || []).forEach((node, index) => {
            const savedNodeLayout = rawGraph.layout?.nodes?.[node.id];
            const treeHeight = heightById.get(node.id) || 72;
            const size = getNodeSize(node, treeHeight);
            const position = getNodePosition(index, savedNodeLayout);
            const cell = graph.insertVertex({
                parent,
                id: node.id,
                value: {
                    kind: 'node',
                    id: node.id,
                    title: getNodeTitle(node),
                    ontologyType: getNodeSubtitle(node),
                    datatype: node.datatype || 'No datatype',
                    raw: node
                },
                position: [position.x, position.y],
                size: [size.width, size.height],
                style: getNodeStyle(node)
            });

            state.nodeCells.set(node.id, cell);
        });

        (rawGraph.edges || []).forEach((edge) => {
            const source = state.nodeCells.get(edge.source);
            const target = state.nodeCells.get(edge.target);

            if (!source || !target) {
                return;
            }

            const cell = graph.insertEdge({
                parent,
                id: edge.id,
                value: {
                    kind: 'edge',
                    id: edge.id,
                    label: edge.ontologyPropertyCode || edge.name || edge.id,
                    raw: edge
                },
                source,
                target,
                style: getEdgeStyle(edge, edgeSlots)
            });

            state.edgeCells.set(edge.id, cell);
            applySavedEdgeLayout(cell, rawGraph.layout?.edges?.[edge.id]);
        });
    });

    if (!rawGraph.layout) {
        runLayout();
    } else {
        //renderPortLabels();
        renderNodeTitleLabels();
        ensureScrollableWorkspace();
        fitGraph();
    }

    state.undoManager?.clear();
}

async function loadSelectedGraph() {
    const { modelSelect, output } = getElements();
    const graphId = modelSelect.value;

    if (!graphId) {
        setSummary('Choose a model first.');
        return;
    }

    output.textContent = '';
    setStatus('');
    setSummary('Loading graph...');

    const rawGraph = await apiFetch(`/api/ontology-usage/models/${graphId}`);

    renderMaxgraph(rawGraph);

    setSummary(
        `${rawGraph.model.name}: ${rawGraph.nodes.length} nodes, ${rawGraph.edges.length} edges.`
    );
    setStatus('Loaded in maxGraph');
}

export function initMaxgraphView() {
    const {
        loadButton,
        fitButton,
        layoutButton,
        alignLeftButton,
        alignTopButton,
        exportButton
    } = getElements();

    loadButton.addEventListener('click', () => {
        loadSelectedGraph().catch((error) => {
            setSummary(error.message);
            console.error('[MaxGraph] graph load failed', error);
        });
    });

    fitButton.addEventListener('click', fitGraph);
    layoutButton.addEventListener('click', runLayout);
    alignLeftButton.addEventListener('click', () => alignSelection('left'));
    alignTopButton.addEventListener('click', () => alignSelection('top'));
    exportButton.addEventListener('click', exportLayout);

    loadModels().catch((error) => {
        setSummary(error.message);
        console.error('[MaxGraph] models load failed', error);
    });
}
