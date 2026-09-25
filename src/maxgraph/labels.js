import { state } from './state.js';
import { getNodeTitle, getSlotY } from './graph-data.js';
import { getNodeTitleLabelStyle, getPortLabelStyle } from './graph-styles.js';

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function withoutUndo(callback) {
    state.suspendUndo = true;

    try {
        return callback();
    } finally {
        state.suspendUndo = false;
    }
}

export function clearNodeTitleLabels() {
    if (!state.graph || !state.nodeTitleCells.length) {
        state.nodeTitleCells = [];
        return;
    }

    withoutUndo(() => {
        state.graph.removeCells(state.nodeTitleCells);
    });

    state.nodeTitleCells = [];
}

export function clearPortLabels() {
    if (!state.graph || !state.portLabelCells.length) {
        state.portLabelCells = [];
        return;
    }

    withoutUndo(() => {
        state.graph.removeCells(state.portLabelCells);
    });

    state.portLabelCells = [];
}

function getPortLabelSize(label) {
    return {
        width: Math.max(44, String(label).length * 5.2 + 12),
        height: 16
    };
}

function getNodeTitleLabelSize(label, nodeWidth) {
    return {
        width: Math.max(nodeWidth, Math.min(Math.max(120, String(label).length * 6 + 18), 360)),
        height: 22
    };
}

export function renderPortLabels() {
    if (!state.graph || !state.rawGraph || !state.edgeSlots) {
        return;
    }

    clearPortLabels();

    const parent = state.graph.getDefaultParent();
    const style = getPortLabelStyle();

    withoutUndo(() => {
        state.graph.batchUpdate(() => {
            (state.rawGraph.edges || []).forEach((edge) => {
                const sourceCell = state.nodeCells.get(edge.source);
                const sourceGeometry = sourceCell?.getGeometry();

                if (!sourceCell || !sourceGeometry) {
                    return;
                }

                const outgoingEdgeIds = state.edgeSlots.outgoing.get(edge.source) || [];
                const ySlot = getSlotY(edge.id, outgoingEdgeIds);
                const label = edge.ontologyPropertyCode || edge.name || edge.id;
                const size = getPortLabelSize(label);
                const x = sourceGeometry.x + sourceGeometry.width - size.width - 6;
                const y = sourceGeometry.y + sourceGeometry.height * ySlot - size.height / 2;
                const cell = state.graph.insertVertex({
                    parent,
                    id: `port-label-${edge.id}`,
                    value: {
                        kind: 'port-label',
                        label,
                        edgeId: edge.id,
                        sourceId: edge.source
                    },
                    position: [x, y],
                    size: [size.width, size.height],
                    style
                });

                state.portLabelCells.push(cell);
            });
        });
    });
}

export function renderNodeTitleLabels() {
    if (!state.graph || !state.rawGraph) {
        return;
    }

    console.debug('[MaxGraph] rebuilding all node title labels', { nodeCount: (state.rawGraph.nodes || []).length });
    clearNodeTitleLabels();

    const parent = state.graph.getDefaultParent();
    const style = getNodeTitleLabelStyle();

    withoutUndo(() => {
        state.graph.batchUpdate(() => {
            (state.rawGraph.nodes || []).forEach((node) => {
                const nodeCell = state.nodeCells.get(node.id);
                const geometry = nodeCell?.getGeometry();

                if (!nodeCell || !geometry) {
                    return;
                }

                const label = getNodeTitle(node);
                const size = getNodeTitleLabelSize(label, geometry.width);
                const x = geometry.x + (geometry.width - size.width) / 2;
                const y = geometry.y - size.height - 6;

                const cell = state.graph.insertVertex({
                    parent,
                    id: `node-title-${node.id}`,
                    value: {
                        kind: 'node-title',
                        label,
                        nodeId: node.id
                    },
                    position: [x, y],
                    size: [size.width, size.height],
                    style
                });

                state.nodeTitleCells.push(cell);
            });
        });
    });
    console.debug('[MaxGraph] rebuilt node title labels', { labelCount: state.nodeTitleCells.length });
}

export function scheduleLabelRender(onRendered) {
    if (!state.graph || state.portLabelFrame) {
        return;
    }

    console.debug('[MaxGraph] scheduled full node title-label rebuild');
    state.portLabelFrame = window.requestAnimationFrame(() => {
        state.portLabelFrame = null;
        //renderPortLabels();
        console.debug('[MaxGraph] running scheduled full node title-label rebuild');
        renderNodeTitleLabels();
        onRendered?.();
    });
}
