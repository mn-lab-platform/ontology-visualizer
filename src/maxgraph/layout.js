import { HierarchicalLayout } from '@maxgraph/core';
import { setStatus } from './elements.js';
import { ensureScrollableWorkspace } from './graph-config.js';
import {
    clearNodeTitleLabels,
    clearPortLabels,
    renderNodeTitleLabels
} from './labels.js';
import { state } from './state.js';

export function applySavedEdgeLayout(edgeCell, savedLayout) {
    const geometry = edgeCell.getGeometry()?.clone();

    if (!geometry || !Array.isArray(savedLayout?.points)) {
        return;
    }

    geometry.points = savedLayout.points;
    state.graph.getDataModel().setGeometry(edgeCell, geometry);
}

export function runLayout() {
    if (!state.graph) {
        setStatus('Nothing to layout');
        return;
    }

    const layout = new HierarchicalLayout(state.graph, 'west');

    clearPortLabels();
    clearNodeTitleLabels();
    layout.intraCellSpacing = 50;
    layout.interRankCellSpacing = 300;
    layout.interHierarchySpacing = 1;
    layout.disableEdgeStyle = false;
    layout.execute(state.graph.getDefaultParent());
    const cells = Array.from(state.nodeCells.values());
    state.graph.moveCells(cells, 500, 500);
    state.edgeCells.forEach((edgeCell) => {
        state.graph.resetEdge(edgeCell);
    });
    //renderPortLabels();
    renderNodeTitleLabels();
    ensureScrollableWorkspace();
    fitGraph();
    setStatus('Layout applied');
}

export function restoreSavedLayout() {
    const savedLayout = state.savedLayout || state.rawGraph?.layout;

    if (!savedLayout?.nodes || !state.graph) {
        runLayout();
        return;
    }

    clearPortLabels();
    clearNodeTitleLabels();
    state.graph.batchUpdate(() => {
        state.nodeCells.forEach((cell, nodeId) => {
            const savedNode = savedLayout.nodes[nodeId];
            const geometry = cell.getGeometry()?.clone();

            if (!savedNode?.position || !geometry) {
                return;
            }

            geometry.x = savedNode.position.x;
            geometry.y = savedNode.position.y;
            if (savedNode.size) {
                geometry.width = savedNode.size.width;
                geometry.height = savedNode.size.height;
            }
            state.graph.getDataModel().setGeometry(cell, geometry);
        });

        state.edgeCells.forEach((edgeCell, edgeId) => {
            applySavedEdgeLayout(edgeCell, savedLayout.edges?.[edgeId]);
        });
    });

    renderNodeTitleLabels();
    ensureScrollableWorkspace();
    fitGraph();
    setStatus('Restored saved layout', 'success');
}

export function fitGraph() {
    if (!state.graph) {
        setStatus('Nothing to fit');
        return;
    }

    const fitPlugin = state.graph.getPlugin?.('FitPlugin') || state.graph.getPlugin?.('fit');

    if (fitPlugin?.fit) {
        fitPlugin.fit({ border: 40 });
    } else {
        state.graph.zoomActual();
        state.graph.center(true, true);
    }

    ensureScrollableWorkspace();
}

export function alignSelection(align) {
    if (!state.graph) {
        setStatus('Nothing to align');
        return;
    }

    const cells = state.graph.getSelectionCells().filter((cell) => cell.isVertex());

    if (cells.length < 2) {
        setStatus('Select at least two nodes');
        return;
    }

    state.graph.alignCells(align, cells);
    //renderPortLabels();
    renderNodeTitleLabels();
    ensureScrollableWorkspace();
    setStatus(`Aligned ${cells.length} nodes`);
}
