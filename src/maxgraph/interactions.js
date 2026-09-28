import { InternalEvent, UndoManager } from '@maxgraph/core';
import { getElements, setStatus } from './elements.js';
import { scheduleLabelRender } from './labels.js';
import { getEdgeStyle } from './graph-styles.js';
import { state } from './state.js';

export function setupUndoManager(graph, ensureScrollableWorkspace) {
    const undoManager = new UndoManager();
    const listener = (sender, event) => {
        if (state.suspendUndo) {
            return;
        }

        undoManager.undoableEditHappened(event.getProperty('edit'));
    };
    const selectionHandler = (sender, event) => {
        const edit = event.getProperty('edit');

        if (edit?.changes) {
            graph.setSelectionCells(graph.getSelectionCellsForChanges(edit.changes));
        }

        scheduleLabelRender(ensureScrollableWorkspace);
        ensureScrollableWorkspace();
    };

    graph.getDataModel().addListener(InternalEvent.UNDO, listener);
    graph.getView().addListener(InternalEvent.UNDO, listener);
    undoManager.addListener(InternalEvent.UNDO, selectionHandler);
    undoManager.addListener(InternalEvent.REDO, selectionHandler);

    state.undoManager = undoManager;
}

function isTextInput(element) {
    const tagName = element?.tagName?.toLowerCase();

    return tagName === 'input' || tagName === 'textarea' || element?.isContentEditable;
}

export function attachKeyboardShortcuts() {
    if (state.keyboardBound) {
        return;
    }

    state.keyboardBound = true;

    document.addEventListener('keydown', (event) => {
        const { container } = getElements();

        if (!state.graph || !state.undoManager || isTextInput(event.target)) {
            return;
        }

        if (container && container.offsetParent === null) {
            return;
        }

        const key = event.key.toLowerCase();

        if ((event.ctrlKey || event.metaKey) && key === 'z') {
            event.preventDefault();

            if (event.shiftKey && state.undoManager.canRedo()) {
                state.undoManager.redo();
                setStatus('Redo');
            } else if (!event.shiftKey && state.undoManager.canUndo()) {
                state.undoManager.undo();
                setStatus('Undo');
            }
        }
    });
}

function getNodeCenterY(nodeId) {
    const geometry = state.nodeCells.get(nodeId)?.getGeometry();

    return geometry ? geometry.y + geometry.height / 2 : 0;
}

function sortEdgesByConnectedNode(edges, getConnectedNodeId) {
    return [...edges].sort((edgeA, edgeB) => {
        const positionDifference = getNodeCenterY(getConnectedNodeId(edgeA))
            - getNodeCenterY(getConnectedNodeId(edgeB));

        return positionDifference || String(edgeA.id).localeCompare(String(edgeB.id));
    });
}

export function updateAffectedEdgeOrder(graph, cells) {
    const edges = state.rawGraph?.edges || [];
    const movedNodeIds = new Set(
        cells
            .filter((cell) => cell.isVertex?.())
            .map((cell) => cell.getId?.() || cell.id)
    );

    if (!edges.length || !state.edgeSlots || !movedNodeIds.size) {
        return;
    }

    const directlyConnectedEdges = edges.filter((edge) => (
        movedNodeIds.has(edge.source) || movedNodeIds.has(edge.target)
    ));

    if (!directlyConnectedEdges.length) {
        return;
    }

    const affectedNodeIds = new Set();

    directlyConnectedEdges.forEach((edge) => {
        affectedNodeIds.add(edge.source);
        affectedNodeIds.add(edge.target);
    });

    affectedNodeIds.forEach((nodeId) => {
        const outgoing = sortEdgesByConnectedNode(
            edges.filter((edge) => edge.source === nodeId),
            (edge) => edge.target
        );
        const incoming = sortEdgesByConnectedNode(
            edges.filter((edge) => edge.target === nodeId),
            (edge) => edge.source
        );

        state.edgeSlots.outgoing.set(nodeId, outgoing.map((edge) => edge.id));
        state.edgeSlots.incoming.set(nodeId, incoming.map((edge) => edge.id));
    });

    graph.batchUpdate(() => {
        edges
            .filter((edge) => affectedNodeIds.has(edge.source) || affectedNodeIds.has(edge.target))
            .forEach((edge) => {
                const edgeCell = state.edgeCells.get(edge.id);

                if (!edgeCell) {
                    return;
                }

                graph.getDataModel().setStyle(edgeCell, getEdgeStyle(edge, state.edgeSlots));
                graph.resetEdge(edgeCell);
            });
    });
}

export function attachGraphChangeListeners(graph, ensureScrollableWorkspace) {
    graph.addListener(InternalEvent.CELLS_MOVED, (sender, event) => {
        updateAffectedEdgeOrder(graph, event.getProperty('cells') || []);
        scheduleLabelRender(ensureScrollableWorkspace);
    });
    graph.addListener(InternalEvent.CELLS_RESIZED, () => {
        scheduleLabelRender(ensureScrollableWorkspace);
    });
}

export function attachViewportControls(container, ensureScrollableWorkspace) {
    if (!container || state.viewportBound) {
        return;
    }

    state.viewportBound = true;
    container.tabIndex = 0;

    let dragState = null;
    let pendingZoomScale = null;
    let pendingZoomPointerPosition = null;
    let zoomFrame = null;
    let workspaceRefreshTimer = null;
    let pendingZoomScrollPosition = null;

    function isPanButton(event) {
        return event.button === 2;
    }

    function blockGraphMouseEvent(event) {
        if (event.button === 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }

    function getPointerPosition(event) {
        const rect = container.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    function ensureViewportFits(scrollPosition) {
        const svg = container.querySelector('svg');

        if (!svg || !scrollPosition) {
            return;
        }

        const requiredWidth = Math.ceil(scrollPosition.left + container.clientWidth + 1);
        const requiredHeight = Math.ceil(scrollPosition.top + container.clientHeight + 1);
        const currentWidth = Number.parseFloat(svg.style.width) || 0;
        const currentHeight = Number.parseFloat(svg.style.height) || 0;

        if (requiredWidth > currentWidth) {
            svg.style.width = `${requiredWidth}px`;
            svg.style.minWidth = `${requiredWidth}px`;
        }

        if (requiredHeight > currentHeight) {
            svg.style.height = `${requiredHeight}px`;
            svg.style.minHeight = `${requiredHeight}px`;
        }
    }

    container.addEventListener('wheel', (event) => {
        if (!state.graph) {
            return;
        }

        const view = state.graph.getView();
        const baseScale = pendingZoomScale ?? view.scale;

        pendingZoomPointerPosition = getPointerPosition(event);

        pendingZoomScale = Math.min(Math.max(baseScale * (event.deltaY < 0 ? 1.1 : 0.9), 0.08), 2.5);

        if (!zoomFrame) {
            zoomFrame = window.requestAnimationFrame(() => {
                zoomFrame = null;

                if (!state.graph || pendingZoomScale === null) {
                    return;
                }

                const nextScale = pendingZoomScale;
                const pointerPosition = pendingZoomPointerPosition;
                pendingZoomScale = null;
                pendingZoomPointerPosition = null;
                const currentScale = state.graph.getView().scale;
                const scaleRatio = nextScale / currentScale;
                const scrollPosition = pendingZoomScrollPosition || {
                    left: container.scrollLeft,
                    top: container.scrollTop
                };

                pendingZoomScrollPosition = {
                    left: Math.max(0, (scrollPosition.left + pointerPosition.x) * scaleRatio - pointerPosition.x),
                    top: Math.max(0, (scrollPosition.top + pointerPosition.y) * scaleRatio - pointerPosition.y)
                };

                state.graph.zoomTo(nextScale, false);
                ensureViewportFits(pendingZoomScrollPosition);
                container.scrollLeft = pendingZoomScrollPosition.left;
                container.scrollTop = pendingZoomScrollPosition.top;
            });
        }

        window.clearTimeout(workspaceRefreshTimer);
        workspaceRefreshTimer = window.setTimeout(() => {
            const finalScrollPosition = pendingZoomScrollPosition;

            ensureScrollableWorkspace();

            if (finalScrollPosition) {
                ensureViewportFits(finalScrollPosition);
                container.scrollLeft = finalScrollPosition.left;
                container.scrollTop = finalScrollPosition.top;
                pendingZoomScrollPosition = null;
            }
        }, 180);

        event.preventDefault();
    }, { passive: false });

    container.addEventListener('pointerdown', (event) => {
        if (!isPanButton(event)) {
            if (event.button !== 0) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
            }

            return;
        }

        dragState = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop
        };

        container.classList.add('maxgraph-diagram--panning');
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }, true);

    let panFrame = null;
    let latestPanEvent = null;

    container.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        latestPanEvent = event;

        if (!panFrame) {
            const panStart = dragState;

            panFrame = requestAnimationFrame(() => {
                panFrame = null;

                container.scrollLeft = panStart.scrollLeft - (latestPanEvent.clientX - panStart.x);
                container.scrollTop = panStart.scrollTop - (latestPanEvent.clientY - panStart.y);
            });
        }

        event.preventDefault();
        event.stopPropagation();
    }, true);

    function finishPan(event) {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        dragState = null;
        if (panFrame) {
            window.cancelAnimationFrame(panFrame);
            panFrame = null;
        }
        latestPanEvent = null;
        container.classList.remove('maxgraph-diagram--panning');
        container.releasePointerCapture?.(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }

    container.addEventListener('mousedown', blockGraphMouseEvent, true);
    container.addEventListener('mouseup', blockGraphMouseEvent, true);
    container.addEventListener('click', blockGraphMouseEvent, true);
    container.addEventListener('dblclick', blockGraphMouseEvent, true);
    container.addEventListener('pointerup', finishPan, true);
    container.addEventListener('pointercancel', finishPan, true);
    container.addEventListener('auxclick', (event) => {
        blockGraphMouseEvent(event);
    }, true);
    container.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }, true);
}
