import { InternalEvent, UndoManager } from '@maxgraph/core';
import { getElements, setStatus } from './elements.js';
import { scheduleLabelRender } from './labels.js';
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

export function attachGraphChangeListeners(graph, ensureScrollableWorkspace) {
    graph.addListener(InternalEvent.CELLS_MOVED, () => {
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
    let zoomCommitTimer = null;
    let zoomWorkspaceTimer = null;

    function isPanButton(event) {
        return event.button === 1 || event.button === 2;
    }

    function blockGraphMouseEvent(event) {
        if (!isPanButton(event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }

    container.addEventListener('wheel', (event) => {
        if (!state.graph) {
            return;
        }

        const view = state.graph.getView();
        const baseScale = pendingZoomScale ?? view.scale;

        pendingZoomScale = Math.min(Math.max(baseScale * (event.deltaY < 0 ? 1.1 : 0.9), 0.08), 2.5);

        if (!zoomCommitTimer) {
            zoomCommitTimer = window.setTimeout(() => {
                zoomCommitTimer = null;

                if (!state.graph || pendingZoomScale === null) {
                    return;
                }

                const nextScale = pendingZoomScale;
                pendingZoomScale = null;

                state.graph.zoomTo(nextScale, true);

                window.clearTimeout(zoomWorkspaceTimer);
                zoomWorkspaceTimer = window.setTimeout(() => {
                    ensureScrollableWorkspace();
                }, 120);
            }, 80);
        }

        event.preventDefault();
    }, { passive: false });

    container.addEventListener('pointerdown', (event) => {
        if (!isPanButton(event)) {
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
    });

    let panFrame = null;
    let latestPanEvent = null;

    container.addEventListener('pointermove', (event) => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        latestPanEvent = event;

        if (!panFrame) {
            panFrame = requestAnimationFrame(() => {
                panFrame = null;

                container.scrollLeft = dragState.scrollLeft - (latestPanEvent.clientX - dragState.x);
                container.scrollTop = dragState.scrollTop - (latestPanEvent.clientY - dragState.y);
            });
        }

        event.preventDefault();
        event.stopPropagation();
    });

    function finishPan(event) {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        dragState = null;
        container.classList.remove('maxgraph-diagram--panning');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }

    container.addEventListener('mousedown', blockGraphMouseEvent, true);
    container.addEventListener('mouseup', blockGraphMouseEvent, true);
    container.addEventListener('click', blockGraphMouseEvent, true);
    container.addEventListener('dblclick', blockGraphMouseEvent, true);
    container.addEventListener('pointerup', finishPan);
    container.addEventListener('pointercancel', finishPan);
    container.addEventListener('auxclick', (event) => {
        blockGraphMouseEvent(event);
    }, true);
    container.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    }, true);
}
