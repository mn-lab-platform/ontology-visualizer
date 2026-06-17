import { getElements, setStatus } from './elements.js';
import { state } from './state.js';

export function collectLayoutState() {
    const nodes = {};
    const edges = {};

    state.nodeCells.forEach((cell, id) => {
        const geometry = cell.getGeometry();

        if (!geometry) {
            return;
        }

        nodes[id] = {
            position: {
                x: Math.round(geometry.x),
                y: Math.round(geometry.y)
            },
            size: {
                width: Math.round(geometry.width),
                height: Math.round(geometry.height)
            }
        };
    });

    state.edgeCells.forEach((cell, id) => {
        const geometry = cell.getGeometry();

        edges[id] = {
            points: (geometry?.points || []).map((point) => ({
                x: Math.round(point.x),
                y: Math.round(point.y)
            }))
        };
    });

    return {
        version: 1,
        engine: 'maxgraph',
        savedAt: new Date().toISOString(),
        nodes,
        edges
    };
}

export function exportLayout() {
    const { output } = getElements();

    if (!state.graph) {
        setStatus('Nothing to export');
        return;
    }

    const layout = collectLayoutState();

    output.textContent = JSON.stringify(layout, null, 2);
    setStatus(`Exported ${Object.keys(layout.nodes).length} nodes`);
    console.log('[MaxGraph] exported layout', layout);
}
