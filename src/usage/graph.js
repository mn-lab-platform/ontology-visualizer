import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import contextMenus from 'cytoscape-context-menus';
import edgeEditing from 'cytoscape-edge-editing';
import Konva from 'konva';
import 'cytoscape-context-menus/cytoscape-context-menus.css';
import { getOntologyFamily } from '../ontology-families.js';
import {
    collectLayoutState,
    saveLayout,
    resetLayout
} from './layout.js';
cytoscape.use(dagre);
cytoscape.use(contextMenus);
edgeEditing(cytoscape, Konva);

let cy = null;
let currentGraph = null;
let currentGraphId = null;
let selectedNodeId = null;
let resizeDragState = null;
let edgeEditor = null;
function getNodeLabel(node) {
    const nodeName = node.name || node.alias || node.id;
    const ontologyType = node.ontologyClassCode || 'No class';

    return `${nodeName}\n(${ontologyType})`;
}

function getNodeSize(node) {
    const label = `${node.name || node.alias || node.id} ${node.ontologyClassCode || 'No class'}`;
    const length = label.length;

    return {
        width: Math.min(Math.max(130, length * 4.5), 280),
        height: Math.min(Math.max(66, Math.ceil(length / 24) * 22 + 42), 170)
    };
}

function buildElements(graph) {
    const nodes = (graph.nodes || []).map((node) => {
        const savedNodeLayout = graph.layout?.nodes?.[node.id];
        const size = savedNodeLayout?.size || getNodeSize(node);

        const element = {
            data: {
                id: node.id,
                label: getNodeLabel(node),
                ontologyClassCode: node.ontologyClassCode || 'No class',
                ontologyFamily: getOntologyFamily(node.ontologyClass || node.ontologyClassCode),
                width: size.width,
                height: size.height,
                raw: node
            }
        };

        if (savedNodeLayout?.position) {
            element.position = savedNodeLayout.position;
        }

        return element;
    });

    const edges = (graph.edges || []).map((edge) => {
        const savedEdgeLayout = graph.layout?.edges?.[edge.id] || {};
        const bendDistances = savedEdgeLayout.cyedgebendeditingDistances || [];
        const bendWeights = savedEdgeLayout.cyedgebendeditingWeights || [];

        return {
            data: {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.ontologyPropertyCode || '',
                ontologyFamily: getOntologyFamily(edge.ontologyProperty || edge.ontologyPropertyCode),
                cyedgebendeditingDistances: bendDistances,
                cyedgebendeditingWeights: bendWeights,
                bendPointPositions: savedEdgeLayout.bendPointPositions || [],
                controlPointPositions: savedEdgeLayout.controlPointPositions || [],
                raw: edge
            },
            classes: bendDistances.length && bendWeights.length
                ? 'edgebendediting-hasbendpoints'
                : ''
        };
    });

    return [...nodes, ...edges];
}

function getLayoutOptions(graph) {
    return graph.layout
        ? { name: 'preset' }
        : {
            name: 'dagre',
            rankDir: 'LR',
            nodeSep: 48,
            rankSep: 120,
            edgeSep: 16
        };
}

function getStyle() {
    return [
        {
            selector: 'node',
            style: {
                'background-color': '#eef2f6',
                'border-color': '#94a3b8',
                'border-width': 1,
                'shape': 'round-rectangle',
                'label': 'data(label)',
                'font-size': 10,
                'font-weight': 600,
                'text-wrap': 'wrap',
                'text-max-width': 220,
                'text-valign': 'top',
                'text-halign': 'center',
                'text-margin-y': 10,
                'color': '#102033',
                'width': 'data(width)',
                'height': 'data(height)',
                'padding': '12px'
            }
        },
        {
            selector: 'node:selected',
            style: {
                'border-color': '#1f5f9f',
                'border-width': 3
            }
        },
        {
            selector: 'node[ontologyFamily = "CIDOC CRM"]',
            style: {
                'background-color': '#ffe8a6',
                'border-color': '#d6b85c'
            }
        },
        {
            selector: 'node[ontologyFamily = "CRMarchaeo"]',
            style: {
                'background-color': '#f6c7a6',
                'border-color': '#d99a6d'
            }
        },
        {
            selector: 'node[ontologyFamily = "CRMdig"]',
            style: {
                'background-color': '#c9dfb8',
                'border-color': '#94b779'
            }
        },
        {
            selector: 'node[ontologyFamily = "CRMsci"]',
            style: {
                'background-color': '#b8dce8',
                'border-color': '#73aebe'
            }
        },
        {
            selector: 'node[ontologyFamily = "CRMgeo"]',
            style: {
                'background-color': '#d4c3e6',
                'border-color': '#a889c5'
            }
        },
        {
            selector: 'node[ontologyFamily = "Literal"]',
            style: {
                'background-color': '#e3e5e8',
                'border-color': '#b7bec7'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 1.5,
                'line-color': '#9aa6b2',
                'target-arrow-color': '#9aa6b2',
                'target-arrow-shape': 'triangle',
                'curve-style': 'segments',
                'edge-distances': 'node-position',
                'label': 'data(label)',
                'font-size': 9,
                'text-background-color': '#fff',
                'text-background-opacity': 0.85,
                'text-background-padding': 2
            }
        }
    ];
}
function initializeEdgeEditing() {
    if (!cy || typeof cy.edgeEditing !== 'function') {
        console.warn('[UsageGraph] edge editing extension is not available');
        return;
    }

    edgeEditor = cy.edgeEditing({
        bendPositionsFunction: (edge) => edge.data('bendPointPositions'),
        controlPositionsFunction: (edge) => edge.data('controlPointPositions'),

        bendPointPositionsSetterFunction: (edge, positions) => {
            edge.data('bendPointPositions', positions);
        },
        controlPointPositionsSetterFunction: (edge, positions) => {
            edge.data('controlPointPositions', positions);
        },

        initAnchorsAutomatically: true,
        enableCreateAnchorOnDrag: true,
        enableRemoveAnchorMidOfNearLine: true,
        handleReconnectEdge: false,
        handleAnchors: true,

        addBendMenuItemTitle: 'Add Bend Point',
        removeBendMenuItemTitle: 'Remove Bend Point',
        removeAllBendMenuItemTitle: 'Remove All Bend Points',

        addControlMenuItemTitle: null,
        removeControlMenuItemTitle: null,
        removeAllControlMenuItemTitle: null,

        anchorColor: '#1f5f9f',
        endPointColor: '#1f5f9f',
        zIndex: 4
    });

    console.log('[UsageGraph] edge editing initialized', {
        initialized: cy.edgeEditing('initialized')
    });
}
export function renderUsageGraph(graph) {
  
    const container = document.getElementById('usage-diagram');

    if (!container) {
        console.error('[UsageGraph] missing #usage-diagram');
        return;
    }
    currentGraph = graph;
    currentGraphId = graph?.model?.graphid || null;
    selectedNodeId = null;
    resizeDragState = null;
    hideResizeHandle();
    if (cy) {
        cy.destroy();
        edgeEditor = null;
        cy = null;
    }

    cy = cytoscape({
        container,
        elements: buildElements(graph),
        style: getStyle(),
        layout: getLayoutOptions(graph)
    });

    window.ontologyUsageCy = cy;
    attachResizeHandle();
    initializeEdgeEditing();
    cy.on('tap', (event) => {
        if (event.target === cy) {
            selectedNodeId = null;
            syncOverlays();
        }
    });

    cy.on('tap', 'node', (event) => {
        selectedNodeId = event.target.id();
        console.log('[UsageGraph] selected node', event.target.data('raw'));
        syncOverlays();
    });

    cy.on('render zoom pan position layoutstop resize', syncOverlays);
    syncOverlays();

    setTimeout(() => {
        cy.resize();
        cy.fit(undefined, 32);
    }, 100);

    console.log('[UsageGraph] rendered', {
        nodes: cy.nodes().length,
        edges: cy.edges().length
    });
}
// Ui functions
export function fitUsageGraph() {
    if (!cy) {
        console.warn('[UsageGraph] fit requested before graph exists');
        return;
    }

    cy.resize();
    cy.fit(undefined, 32);
}

export function runUsageLayout() {
    if (!cy) {
        console.warn('[UsageGraph] layout requested before graph exists');
        return;
    }

    cy.layout({
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 48,
        rankSep: 120,
        edgeSep: 16
    }).run();
}

export async function saveCurrentUsageLayout() {
    if (!cy || !currentGraphId) {
        setLayoutStatus('Nothing to save');
        return;
    }

    const layout = collectLayoutState(cy);

    if (!layout) {
        setLayoutStatus('Nothing to save');
        return;
    }

    setLayoutStatus('Saving view...');

    try {
        await saveLayout(currentGraphId, layout);

        if (currentGraph) {
            currentGraph.layout = layout;
        }

        setLayoutStatus('View saved');
        console.log('[UsageGraph] layout saved', layout);
    } catch (error) {
        setLayoutStatus(`Save failed: ${error.message}`);
        console.error('[UsageGraph] save layout failed', error);
    }
}

export async function resetCurrentUsageLayout() {
    if (!currentGraph || !currentGraphId) {
        setLayoutStatus('Nothing to reset');
        return;
    }

    setLayoutStatus('Resetting saved view...');

    try {
        await resetLayout(currentGraphId);

        currentGraph.layout = null;
        renderUsageGraph(currentGraph);

        setLayoutStatus('Saved view reset');
    } catch (error) {
        setLayoutStatus(`Reset failed: ${error.message}`);
        console.error('[UsageGraph] reset layout failed', error);
    }
}

function setLayoutStatus(message) {
    const status = document.getElementById('layout-status');

    if (status) {
        status.textContent = message;
    }
}
//node size helpers
function getResizeHandle() {
    return document.getElementById('usage-resize-handle');
}

function hideResizeHandle() {
    const handle = getResizeHandle();

    if (handle) {
        handle.style.display = 'none';
    }
}

function syncResizeHandle() {
    const handle = getResizeHandle();

    if (!handle || !cy || !selectedNodeId) {
        hideResizeHandle();
        return;
    }

    const node = cy.getElementById(selectedNodeId);

    if (!node || node.empty()) {
        hideResizeHandle();
        return;
    }

    const position = node.renderedPosition();

    handle.style.display = 'block';
    handle.style.left = `${position.x + node.renderedWidth() / 2 - 7}px`;
    handle.style.top = `${position.y + node.renderedHeight() / 2 - 7}px`;
}

function syncOverlays() {
    window.requestAnimationFrame(() => {
        syncResizeHandle();
    });
}

function getPointerPosition(event) {
    return {
        x: event.clientX,
        y: event.clientY
    };
}

function setNodeSize(node, size) {
    const nextSize = {
        width: Math.round(Math.max(size.width, 80)),
        height: Math.round(Math.max(size.height, 48))
    };

    node.data(nextSize);
    syncOverlays();

    return nextSize;
}
function attachResizeHandle() {
    const handle = getResizeHandle();

    if (!handle || handle.dataset.bound === 'true') {
        return;
    }

    handle.dataset.bound = 'true';

    handle.addEventListener('pointerdown', (event) => {
        if (!cy || !selectedNodeId) {
            return;
        }

        const node = cy.getElementById(selectedNodeId);

        if (!node || node.empty()) {
            return;
        }

        const pointer = getPointerPosition(event);

        resizeDragState = {
            nodeId: node.id(),
            startX: pointer.x,
            startY: pointer.y,
            startWidth: Number(node.data('width')) || node.width(),
            startHeight: Number(node.data('height')) || node.height()
        };

        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();

        console.log('[UsageGraph] node resize started', resizeDragState);
    });

    handle.addEventListener('pointermove', (event) => {
        if (!resizeDragState || !cy) {
            return;
        }

        const node = cy.getElementById(resizeDragState.nodeId);

        if (!node || node.empty()) {
            return;
        }

        const pointer = getPointerPosition(event);
        const zoom = cy.zoom() || 1;

        setNodeSize(node, {
            width: resizeDragState.startWidth + (pointer.x - resizeDragState.startX) / zoom,
            height: resizeDragState.startHeight + (pointer.y - resizeDragState.startY) / zoom
        });

        event.preventDefault();
        event.stopPropagation();
    });

    handle.addEventListener('pointerup', (event) => {
        if (!resizeDragState) {
            return;
        }

        console.log('[UsageGraph] node resize finished', {
            nodeId: resizeDragState.nodeId
        });

        resizeDragState = null;
        event.preventDefault();
        event.stopPropagation();
    });

    handle.addEventListener('pointercancel', () => {
        resizeDragState = null;
    });
}