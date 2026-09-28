import { getElements } from './elements.js';
import { getNodeSubtitle, getNodeTitle } from './graph-data.js';
import { state } from './state.js';

const MAX_RESULTS = 8;
const FOCUS_SCALE = 1.1;

function getMatches(query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery || !state.rawGraph) {
        return [];
    }

    return (state.rawGraph.nodes || [])
        .filter((node) => {
            const searchableText = [
                getNodeTitle(node),
                node.alias,
                getNodeSubtitle(node),
                node.datatype,
                node.id
            ].filter(Boolean).join(' ').toLocaleLowerCase();

            return searchableText.includes(normalizedQuery);
        })
        .slice(0, MAX_RESULTS);
}

function clearResults(results) {
    results.replaceChildren();
}

function renderResults(query) {
    const { searchResults } = getElements();

    if (!searchResults) {
        return;
    }

    const matches = getMatches(query);

    clearResults(searchResults);

    if (!query.trim()) {
        return;
    }

    if (!matches.length) {
        const emptyResult = document.createElement('li');

        emptyResult.className = 'maxgraph-search__empty';
        emptyResult.textContent = 'No matching nodes.';
        searchResults.appendChild(emptyResult);
        return;
    }

    matches.forEach((node) => {
        const result = document.createElement('button');
        const title = document.createElement('span');
        const subtitle = document.createElement('span');
        const item = document.createElement('li');

        result.type = 'button';
        result.className = 'maxgraph-search__result';
        result.dataset.nodeId = node.id;
        title.className = 'maxgraph-search__result-title';
        subtitle.className = 'maxgraph-search__result-subtitle';
        title.textContent = getNodeTitle(node);
        subtitle.textContent = [getNodeSubtitle(node), node.alias].filter(Boolean).join(' · ');
        result.append(title, subtitle);
        item.appendChild(result);
        searchResults.appendChild(item);
    });
}

function focusNode(nodeId) {
    const { container } = getElements();
    const cell = state.nodeCells.get(nodeId);

    if (!cell || !container || !state.graph) {
        return;
    }

    state.graph.setSelectionCell(cell);

    const currentScale = state.graph.getView().scale;
    const scaleRatio = FOCUS_SCALE / currentScale;
    const viewportCenter = {
        x: container.scrollLeft + container.clientWidth / 2,
        y: container.scrollTop + container.clientHeight / 2
    };

    state.graph.zoomTo(FOCUS_SCALE, false);
    container.scrollLeft = Math.max(0, viewportCenter.x * scaleRatio - container.clientWidth / 2);
    container.scrollTop = Math.max(0, viewportCenter.y * scaleRatio - container.clientHeight / 2);

    window.requestAnimationFrame(() => {
        const cellState = state.graph.getView().getState(cell);

        if (!cellState) {
            return;
        }

        container.scrollTo({
            left: Math.max(0, cellState.x + cellState.width / 2 - container.clientWidth / 2),
            top: Math.max(0, cellState.y + cellState.height / 2 - container.clientHeight / 2),
            behavior: 'smooth'
        });
    });
}

function closeSearch() {
    const { search, searchInput, searchResults, searchToggle } = getElements();

    if (!search || !searchInput || !searchResults || !searchToggle) {
        return;
    }

    search.hidden = true;
    searchInput.value = '';
    searchToggle.setAttribute('aria-expanded', 'false');
    clearResults(searchResults);
}

export function setNodeSearchDisabled(disabled) {
    const { searchToggle } = getElements();

    if (!searchToggle) {
        return;
    }

    searchToggle.disabled = disabled;

    if (disabled) {
        closeSearch();
    }
}

export function initNodeSearch() {
    const {
        searchToggle,
        search,
        searchInput,
        searchResults
    } = getElements();

    if (!searchToggle || !search || !searchInput || !searchResults || searchToggle.dataset.bound) {
        return;
    }

    searchToggle.dataset.bound = 'true';

    searchToggle.addEventListener('click', () => {
        const nextOpen = search.hidden;

        search.hidden = !nextOpen;
        searchToggle.setAttribute('aria-expanded', String(nextOpen));

        if (nextOpen) {
            searchInput.focus();
        } else {
            closeSearch();
        }
    });

    searchInput.addEventListener('input', () => {
        renderResults(searchInput.value);
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSearch();
            searchToggle.focus();
            return;
        }

        if (event.key === 'Enter') {
            const firstResult = searchResults.querySelector('.maxgraph-search__result');

            if (firstResult) {
                firstResult.click();
            }
        }
    });

    searchResults.addEventListener('click', (event) => {
        const result = event.target.closest('.maxgraph-search__result');

        if (!result) {
            return;
        }

        focusNode(result.dataset.nodeId);
        closeSearch();
    });
}
