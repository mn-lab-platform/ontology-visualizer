import { apiFetch } from '../api.js';
import { getElements, setStatus, setSummary } from './elements.js';
import { exportLayout } from './export-layout.js';
import { loadStoredLayout } from './layout-storage.js';
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
import { updateAffectedEdgeOrder } from './interactions.js';
import { renderNodeTitleLabels } from './labels.js';
import { alignSelection, applySavedEdgeLayout, fitGraph, restoreSavedLayout, runLayout } from './layout.js';
import { state } from './state.js';
import { renderDetailsLegend } from './details-panel.js';
import { initNodeSearch, setNodeSearchDisabled } from './node-search.js';

function setGraphActionsDisabled(disabled) {
    const {
        fitButton,
        layoutButton,
        alignLeftButton,
        alignTopButton,
        alignRightButton,
        alignBottomButton,
        exportButton
    } = getElements();

    [fitButton, layoutButton, alignLeftButton, alignTopButton, alignRightButton, alignBottomButton, exportButton]
        .forEach((button) => {
            button.disabled = disabled;
        });
    setNodeSearchDisabled(disabled);

}
function setGraphLoading(loading) {
    const { modelSelect, loadButton, container } = getElements();

    modelSelect.disabled = loading;
    loadButton.disabled = loading;
    loadButton.textContent = loading ? 'Loading...' : 'Load graph';
    container.setAttribute('aria-busy', String(loading));

    if (loading) {
        setGraphActionsDisabled(true);
    } else {
        setGraphActionsDisabled(!state.graph);
    }
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
    const { modelSelect, loadButton } = getElements();

    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    modelSelect.disabled = true;
    loadButton.disabled = true;
    setSummary('Loading resource models...', 'loading');

    const data = await apiFetch('/api/ontology-usage/models');

    state.models = data.models || [];
    fillModelSelect(state.models);
    modelSelect.disabled = !state.models.length;
    loadButton.disabled = !state.models.length;
    setSummary(`Loaded ${state.models.length} resource models.`, 'success');
}

function renderMaxgraph(rawGraph, graphId) {
    const graph = createGraphInstance();
    const parent = graph.getDefaultParent();
    const childrenMap = buildChildrenMap(rawGraph.edges || []);
    const edgeSlots = buildEdgeSlots(rawGraph.edges || []);
    const heightById = new Map();

    state.rawGraph = rawGraph;
    state.currentGraphId = graphId;
    state.edgeSlots = edgeSlots;

    (rawGraph.nodes || []).forEach((node) => {
        getNodeTreeHeight(node.id, childrenMap, heightById);
    });

    graph.batchUpdate(() => {
        (rawGraph.nodes || []).forEach((node, index) => {
            const savedNodeLayout = rawGraph.layout?.nodes?.[node.id];
            const treeHeight = heightById.get(node.id) || 72;
            const size = savedNodeLayout?.size || getNodeSize(node, treeHeight);
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
        updateAffectedEdgeOrder(graph, Array.from(state.nodeCells.values()));
        //renderPortLabels();
        renderNodeTitleLabels();
        ensureScrollableWorkspace();
        fitGraph();
    }

    state.undoManager?.clear();
}

async function loadSelectedGraph() {
    const { modelSelect } = getElements();
    const graphId = modelSelect.value;

    if (!graphId) {
        setSummary('Choose a model first.', 'warning');
        return;
    }

    setStatus('');
    setSummary('Loading graph...', 'loading');
    setGraphLoading(true);
    let rawGraph;
    let savedLayout;
    let storageError;

    try {
        rawGraph = await apiFetch(`/api/ontology-usage/models/${graphId}`);

        try {
            savedLayout = await loadStoredLayout(graphId);
            rawGraph.layout = savedLayout;
            state.savedLayout = savedLayout;
        } catch (error) {
            storageError = error;
            console.warn('[MaxGraph] saved layout load failed', error);
        }

        renderMaxgraph(rawGraph, graphId);

        setSummary(
            `${rawGraph.model.name}: ${rawGraph.nodes.length} nodes, ${rawGraph.edges.length} edges.`,
            'success'
        );
        setStatus(
            storageError
                ? `Loaded; local layout unavailable: ${storageError.message}`
                : savedLayout
                    ? 'Loaded saved layout'
                    : 'Loaded with automatic layout',
            storageError ? 'warning' : 'success'
        );
    } finally {
        setGraphLoading(false);
    }
}

export function initMaxgraphView() {
    const {
        loadButton,
        fitButton,
        layoutButton,
        alignLeftButton,
        alignTopButton,
        alignRightButton,
        alignBottomButton,
        exportButton
    } = getElements();

    renderDetailsLegend();
    initNodeSearch();
    setGraphActionsDisabled(true);

    loadButton.addEventListener('click', () => {
        loadSelectedGraph().catch((error) => {
            setSummary(`Graph load failed: ${error.message}`, 'error');
            setStatus('Graph was not loaded', 'error');
            console.error('[MaxGraph] graph load failed', error);
        });
    });

    fitButton.addEventListener('click', fitGraph);
    layoutButton.addEventListener('click', restoreSavedLayout);
    alignRightButton.addEventListener('click', () => alignSelection('right'));
    alignBottomButton.addEventListener('click', () => alignSelection('bottom'));
    alignLeftButton.addEventListener('click', () => alignSelection('left'));
    alignTopButton.addEventListener('click', () => alignSelection('top'));
    exportButton.addEventListener('click', async () => {
        exportButton.disabled = true;

        try {
            await exportLayout();
        } catch (error) {
            setStatus(`Layout save failed: ${error.message}`, 'error');
            console.error('[MaxGraph] layout save failed', error);
        } finally {
            exportButton.disabled = !state.graph;
        }
    });

    loadModels().catch((error) => {
        setSummary(`Models could not be loaded: ${error.message}`, 'error');
        console.error('[MaxGraph] models load failed', error);
    });
}
