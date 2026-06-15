import { apiFetch } from '../api.js';
import { getOntologyFamily } from '../ontology-families.js';

const periodicState = {
    cidoc: null,
    selectedItem: null
};

function getElements() {
    return {
        loadButton: document.getElementById('load-cidoc'),
        summary: document.getElementById('cidoc-summary'),
        search: document.getElementById('cidoc-search'),
        kind: document.getElementById('cidoc-kind'),
        source: document.getElementById('cidoc-source'),
        grid: document.getElementById('cidoc-grid'),
        detail: document.getElementById('cidoc-detail')
    };
}

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getSourceLabel(filename) {
    return String(filename || '')
        .replace('.rdf', '')
        .replace('.owl', '')
        .replaceAll('_', ' ');
}

function fillSourceSelect(cidoc) {
    const { source } = getElements();

    source.innerHTML = '<option value="">All ontologies</option>';

    cidoc.ontologies.forEach((ontology) => {
        const option = document.createElement('option');

        option.value = ontology.filename;
        option.textContent =
            `${getSourceLabel(ontology.filename)} (${ontology.class_count} classes, ${ontology.property_count} properties)`;

        source.appendChild(option);
    });
}

function getVisibleItems() {
    const { search, kind, source } = getElements();
    const cidoc = periodicState.cidoc;

    if (!cidoc) {
        return [];
    }

    const query = search.value.trim().toLowerCase();
    const selectedKind = kind.value;
    const selectedSource = source.value;
    const items = selectedKind === 'properties'
        ? cidoc.properties
        : cidoc.classes;

    return items.filter((item) => {
        const matchesSource = !selectedSource || item.source === selectedSource;
        const searchableText = [
            item.id,
            item.label,
            item.comment,
            item.source
        ].join(' ').toLowerCase();

        return matchesSource && (!query || searchableText.includes(query));
    });
}

function renderGrid() {
    const { grid, kind } = getElements();
    const items = getVisibleItems();

    grid.innerHTML = '';

    if (!items.length) {
        grid.innerHTML = '<div class="periodic-empty">No matching items.</div>';
        return;
    }

    items.forEach((item) => {
        const family = getOntologyFamily(item.uri || item.id);
        const card = document.createElement('button');

        card.type = 'button';
        card.className = `periodic-card periodic-card--${familyToClass(family)}`;
        card.innerHTML = `
            <span class="periodic-card__id">${escapeHtml(item.id)}</span>
            <span class="periodic-card__label">${escapeHtml(item.label)}</span>
            <span class="periodic-card__source">${escapeHtml(getSourceLabel(item.source))}</span>
        `;

        card.addEventListener('click', () => {
            periodicState.selectedItem = {
                kind: kind.value,
                item
            };
            renderDetail();
        });

        grid.appendChild(card);
    });
}

function familyToClass(family) {
    return family
        .toLowerCase()
        .replaceAll(' ', '-');
}

function renderRefs(title, refs) {
    if (!refs || !refs.length) {
        return '';
    }

    return `
        <section class="periodic-detail__section">
            <h4>${escapeHtml(title)}</h4>
            <div class="periodic-ref-list">
                ${refs.map((ref) => `<span>${escapeHtml(ref.id)}</span>`).join('')}
            </div>
        </section>
    `;
}

function renderDetail() {
    const { detail } = getElements();
    const selected = periodicState.selectedItem;

    if (!selected) {
        detail.innerHTML = 'Select an item.';
        return;
    }

    const item = selected.item;
    const isProperty = selected.kind === 'properties';

    detail.innerHTML = `
        <div class="periodic-detail__header">
            <strong>${escapeHtml(item.id)}</strong>
            <span>${escapeHtml(getSourceLabel(item.source))}</span>
        </div>

        <h3>${escapeHtml(item.label)}</h3>

        <p>${escapeHtml(item.comment || 'No description.')}</p>

        ${isProperty ? renderRefs('Domain', item.domain) : ''}
        ${isProperty ? renderRefs('Range', item.range) : ''}
        ${isProperty ? renderRefs('Superproperties', item.superproperties) : ''}
        ${!isProperty ? renderRefs('Superclasses', item.superclasses) : ''}
        ${!isProperty ? renderRefs('Subclasses', item.subclasses) : ''}
    `;
}

function renderCidoc() {
    const cidoc = periodicState.cidoc;
    const { summary, kind } = getElements();

    if (!cidoc) {
        return;
    }

    const visibleItems = getVisibleItems();

    summary.textContent =
        `${cidoc.metadata.base_name} ${cidoc.metadata.base_version}: ` +
        `${cidoc.classes.length} classes, ${cidoc.properties.length} properties, ` +
        `${cidoc.relationships.length} relationships. Showing ${visibleItems.length} ${kind.value}.`;

    renderGrid();
}

async function loadCidoc() {
    const { summary, grid, detail } = getElements();

    summary.textContent = 'Loading CIDOC data...';
    grid.innerHTML = '';
    detail.innerHTML = 'Select an item.';

    const cidoc = await apiFetch('/arches/local/api/cidoc-periodic-table');

    periodicState.cidoc = cidoc;
    periodicState.selectedItem = null;

    fillSourceSelect(cidoc);
    renderCidoc();
}

export function initPeriodicView() {
    const { loadButton, summary, search, kind, source } = getElements();

    loadButton.addEventListener('click', () => {
        loadCidoc().catch((error) => {
            summary.textContent = error.message;
            console.error('[PeriodicTable] CIDOC load failed', error);
        });
    });

    [search, kind, source].forEach((element) => {
        element.addEventListener('input', renderCidoc);
        element.addEventListener('change', renderCidoc);
    });
}