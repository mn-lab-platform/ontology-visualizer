import { setStatus } from './elements.js';
import { state } from './state.js';
import { saveStoredLayout } from './layout-storage.js';

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

export async function exportLayout() {
    if (!state.graph || !state.currentGraphId) {
        setStatus('Load a resource model first', 'warning');
        return;
    }

    const layout = collectLayoutState();

    setStatus('Saving layout...', 'loading');
    await saveStoredLayout(state.currentGraphId, layout);

    setStatus(`Saved layout for ${Object.keys(layout.nodes).length} nodes`, 'success');
    state.savedLayout = layout;
    if (state.rawGraph) {
        state.rawGraph.layout = layout;
    }
    console.log('[MaxGraph] saved layout', layout);
}
