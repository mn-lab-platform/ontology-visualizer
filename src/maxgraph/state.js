export const state = {
    models: [],
    rawGraph: null,
    currentGraphId: null,
    graph: null,
    nodeCells: new Map(),
    edgeCells: new Map(),
    portLabelCells: [],
    nodeTitleCells: [],
    nodeTitleFrame: null,
    portLabelFrame: null,
    edgeSlots: null,
    viewportBound: false,
    keyboardBound: false,
    undoManager: null,
    suspendUndo: false
};

export function resetGraphState() {
    if (state.portLabelFrame) {
        window.cancelAnimationFrame(state.portLabelFrame);
    }

    if (state.nodeTitleFrame) {
        window.cancelAnimationFrame(state.nodeTitleFrame);
    }

    state.graph = null;
    state.rawGraph = null;
    state.currentGraphId = null;
    state.nodeCells = new Map();
    state.edgeCells = new Map();
    state.portLabelCells = [];
    state.nodeTitleCells = [];
    state.nodeTitleFrame = null;
    state.portLabelFrame = null;
    state.edgeSlots = null;
    state.viewportBound = false;
    state.undoManager = null;
    state.suspendUndo = false;
}
