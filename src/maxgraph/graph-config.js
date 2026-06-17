import { Graph, RubberBandHandler } from '@maxgraph/core';
import '@maxgraph/core/css/common.css';
import { getElements } from './elements.js';
import {
    attachGraphChangeListeners,
    attachKeyboardShortcuts,
    attachViewportControls,
    setupUndoManager
} from './interactions.js';
import { escapeHtml } from './labels.js';
import { resetGraphState, state } from './state.js';
import { attachDetailsPanel } from './details-panel.js';

function configureGraph(graph) {
    graph.setPanning(false);
    graph.setTooltips(true);
    graph.setConnectable(false);
    graph.setCellsEditable(false);
    graph.setCellsResizable(true);
    graph.setCellsBendable(true);
    graph.setCellsDisconnectable(false);
    graph.setHtmlLabels(true);

    graph.resetEdgesOnResize = true;
    graph.resetEdgesOnMove = false;

    const selectionHandler = graph.getPlugin?.('SelectionHandler');

    if (selectionHandler) {
        selectionHandler.guidesEnabled = true;
        selectionHandler.scrollOnMove = false;
    }

    graph.convertValueToString = (cell) => {
        const value = cell.value;

        if (value?.kind === 'edge') {
            return value.label;
        }

        if (value?.kind === 'port-label') {
            return escapeHtml(value.label);
        }

        if (value?.kind === 'node-title') {
            return escapeHtml(value.label);
        }

        if (value?.kind !== 'node') {
            return '';
        }

        const ontologyType = String(value.ontologyType || '').replaceAll('_', ' ');
        const datatype = String(value.datatype || '');

        return `${ontologyType}\n${datatype}`;
    };

    new RubberBandHandler(graph);
}

export function destroyGraph() {
    const { container } = getElements();

    resetGraphState();

    if (container) {
        container.innerHTML = '';
    }
}

export function createGraphInstance() {
    const { container } = getElements();

    destroyGraph();

    if (!container) {
        throw new Error('Missing maxGraph container.');
    }

    const graph = new Graph(container);

    configureGraph(graph);
    setupUndoManager(graph, ensureScrollableWorkspace);
    attachGraphChangeListeners(graph, ensureScrollableWorkspace);
    attachViewportControls(container, ensureScrollableWorkspace);
    attachKeyboardShortcuts();
    attachDetailsPanel(graph);
    state.graph = graph;
    window.ontologyMaxGraph = graph;

    return graph;
}

export function ensureScrollableWorkspace() {
    const { container } = getElements();

    if (!container || !state.graph) {
        return;
    }

    const bounds = state.graph.getGraphBounds();
    const padding = 800;
    const width = Math.max(container.clientWidth * 2, bounds.x + bounds.width + padding);
    const height = Math.max(container.clientHeight * 2, bounds.y + bounds.height + padding);
    const svg = container.querySelector('svg');

    if (svg) {
        svg.style.width = `${Math.ceil(width)}px`;
        svg.style.height = `${Math.ceil(height)}px`;
        svg.style.minWidth = `${Math.ceil(width)}px`;
        svg.style.minHeight = `${Math.ceil(height)}px`;
    }
}
