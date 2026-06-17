export function getNodeTitle(node) {
    return node.name || node.alias || node.id;
}

export function getNodeSubtitle(node) {
    return node.ontologyClassCode || 'No class';
}

export function buildChildrenMap(edges) {
    const childrenMap = new Map();

    edges.forEach((edge) => {
        if (!childrenMap.has(edge.source)) {
            childrenMap.set(edge.source, []);
        }

        childrenMap.get(edge.source).push(edge.target);
    });

    return childrenMap;
}

export function getNodeTreeHeight(nodeId, childrenMap, heightById, visiting = new Set()) {
    if (heightById.has(nodeId)) {
        return heightById.get(nodeId);
    }

    if (visiting.has(nodeId)) {
        return 72;
    }

    visiting.add(nodeId);

    const children = childrenMap.get(nodeId) || [];
    const baseHeight = 72;
    const gap = 40;

    if (!children.length) {
        heightById.set(nodeId, baseHeight);
        visiting.delete(nodeId);
        return baseHeight;
    }

    const childrenHeight = children.reduce((sum, childId) => {
        return sum + getNodeTreeHeight(childId, childrenMap, heightById, visiting);
    }, 0);

    const gapsHeight = Math.max(0, children.length - 1) * gap;
    const height = Math.max(baseHeight, childrenHeight + gapsHeight);

    heightById.set(nodeId, height);
    visiting.delete(nodeId);

    return height;
}

export function getNodeSize(node, treeHeight = 72) {
    const label = `${getNodeTitle(node)} ${getNodeSubtitle(node)}`;
    const labelWidth = label.length * 5;

    return {
        width: Math.min(Math.max(170, labelWidth + 40), 460),
        height: treeHeight
    };
}

export function getNodePosition(index, savedLayout) {
    if (savedLayout?.position) {
        return savedLayout.position;
    }

    return {
        x: 80 + (index % 4) * 260,
        y: 80 + Math.floor(index / 4) * 160
    };
}

export function buildEdgeSlots(edges) {
    const outgoing = new Map();
    const incoming = new Map();

    edges.forEach((edge) => {
        if (!outgoing.has(edge.source)) {
            outgoing.set(edge.source, []);
        }

        if (!incoming.has(edge.target)) {
            incoming.set(edge.target, []);
        }

        outgoing.get(edge.source).push(edge.id);
        incoming.get(edge.target).push(edge.id);
    });

    return { outgoing, incoming };
}

export function getSlotY(edgeId, edgeIds) {
    const index = edgeIds.indexOf(edgeId);

    if (index === -1) {
        return 0.5;
    }

    return (index + 1) / (edgeIds.length + 1);
}
