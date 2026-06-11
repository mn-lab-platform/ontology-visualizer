import { apiFetch } from '../api.js';

export function collectLayoutState(cy) {
    const nodes = {};
    const edges = {};

    if (!cy) {
        return null;
    }

    cy.nodes().forEach((node) => {
        nodes[node.id()] = {
            position: node.position(),
            size: {
                width: Number(node.data('width')) || node.width(),
                height: Number(node.data('height')) || node.height()
            }
        };
    });

    cy.edges().forEach((edge) => {
        edges[edge.id()] = {
            cyedgebendeditingDistances: edge.data('cyedgebendeditingDistances') || [],
            cyedgebendeditingWeights: edge.data('cyedgebendeditingWeights') || [],
            bendPointPositions: edge.data('bendPointPositions') || [],
            controlPointPositions: edge.data('controlPointPositions') || []
        };
    });

    return {
        version: 1,
        savedAt: new Date().toISOString(),
        viewport: {
            pan: cy.pan(),
            zoom: cy.zoom()
        },
        nodes,
        edges
    };
}

export function saveLayout(graphId, layout) {
    return apiFetch(`/api/ontology-usage/models/${graphId}/layout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ layout })
    });
}

export function resetLayout(graphId) {
    return apiFetch(`/api/ontology-usage/models/${graphId}/layout`, {
        method: 'DELETE'
    });
}