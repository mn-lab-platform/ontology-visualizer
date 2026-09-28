import { InternalEvent } from '@maxgraph/core';
import { getElements } from './elements.js';
import { FAMILY_COLORS } from './graph-styles.js';
import { escapeHtml } from './labels.js';
import { state } from './state.js';

const FAMILY_DESCRIPTIONS = {
    'CIDOC CRM': 'Core CIDOC CRM classes',
    CRMarchaeo: 'Archaeological extension',
    CRMdig: 'Digital provenance extension',
    CRMsci: 'Scientific observation extension',
    CRMgeo: 'Spatial extension',
    Literal: 'Literal values and other datatypes'
};

function getNodeEdges(nodeId) {
    const edges = state.rawGraph?.edges || [];

    return {
        incoming: edges.filter((edge) => edge.target === nodeId),
        outgoing: edges.filter((edge) => edge.source === nodeId)
    };
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return '<span class="maxgraph-details__muted">-</span>';
    }

    if (typeof value === 'object') {
        return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }

    return escapeHtml(value);
}

function renderField(label, value) {
    return `
        <dt>${escapeHtml(label)}</dt>
        <dd>${formatValue(value)}</dd>
    `;
}

function renderEdges(title, edges) {
    if (!edges.length) {
        return `
            <section class="maxgraph-details__section">
                <h4>${escapeHtml(title)}</h4>
                <p class="maxgraph-details__muted">No edges</p>
            </section>
        `;
    }

    return `
        <section class="maxgraph-details__section">
            <h4>${escapeHtml(title)}</h4>
            <ul>
                ${edges.map((edge) => `
                    <li>
                        <strong>${escapeHtml(edge.ontologyPropertyCode || edge.name || edge.id)}</strong>
                        <span>${escapeHtml(edge.source)} -> ${escapeHtml(edge.target)}</span>
                    </li>
                `).join('')}
            </ul>
        </section>
    `;
}

function renderNodeDetails(cell) {
    const { details } = getElements();
    const value = cell?.value;

    if (!details || value?.kind !== 'node') {
        return;
    }

    const node = value.raw || {};
    const { incoming, outgoing } = getNodeEdges(value.id);

    details.innerHTML = `
        <header class="maxgraph-details__header">
            <h3>${escapeHtml(value.title || node.name || node.id)}</h3>
            <span>${escapeHtml(value.ontologyType || node.ontologyClassCode || 'No class')}</span>
        </header>

        <section class="maxgraph-details__section">
            <h4>Node</h4>
            <dl>
                ${renderField('Name', node.name)}
                ${renderField('Alias', node.alias)}
                ${renderField('Datatype', node.datatype)}
                ${renderField('Ontology class', node.ontologyClass)}
                ${renderField('Ontology class code', node.ontologyClassCode)}
            </dl>
        </section>
        ${renderConcepts(node.concepts)}
        ${renderEdges('Outgoing edges', outgoing)}
        ${renderEdges('Incoming edges', incoming)}

    `;
}

export function renderDetailsLegend() {
    const { details } = getElements();

    if (details) {
        details.innerHTML = `
            <header class="maxgraph-details__header">
                <h3>Ontology families</h3>
                <span>Select a node to see its metadata</span>
            </header>
            <ul class="maxgraph-legend" aria-label="Ontology family colors">
                ${Object.entries(FAMILY_COLORS).map(([family, colors]) => `
                    <li class="maxgraph-legend__item">
                        <span
                            class="maxgraph-legend__swatch"
                            style="--legend-fill: ${colors.fill}; --legend-stroke: ${colors.stroke}"
                            aria-hidden="true"
                        ></span>
                        <span class="maxgraph-legend__label">
                            <strong>${escapeHtml(family)}</strong>
                            <span>${escapeHtml(FAMILY_DESCRIPTIONS[family] || '')}</span>
                        </span>
                    </li>
                `).join('')}
            </ul>
        `;
    }
}
function renderConcepts(concepts) {
    if (!concepts?.collection) {
        return '';
    }

    const values = concepts.values || [];

    return `
        <section class="maxgraph-details__section">
            <h4>Concepts</h4>
            <dl>
                ${renderField('Collection', concepts.collection.label || concepts.collection.id)}
                ${renderField('Concept count', values.length)}
            </dl>

            <ul class="maxgraph-details__concepts">
                ${values.map((concept) => `
                    <li>
                        <strong>${escapeHtml(concept.prefLabel || concept.id)}</strong>
                        ${
                            concept.altLabels?.length
                                ? `<span>alt: ${escapeHtml(concept.altLabels.join(', '))}</span>`
                                : ''
                        }
                    </li>
                `).join('')}
            </ul>
        </section>
    `;
}
export function attachDetailsPanel(graph) {
    renderDetailsLegend();

    graph.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
        const selectedCells = graph.getSelectionCells();
        const selectedNode = selectedCells
            .find((cell) => cell?.value?.kind === 'node');
        const selectedTitle = selectedCells
            .find((cell) => cell?.value?.kind === 'node-title');

        if (selectedNode) {
            renderNodeDetails(selectedNode);
        } else if (selectedTitle) {
            const linkedNode = state.nodeCells.get(selectedTitle.value.nodeId);

            if (linkedNode) {
                graph.setSelectionCell(linkedNode);
            } else {
                renderDetailsLegend();
            }
        } else {
            renderDetailsLegend();
        }
    });
}