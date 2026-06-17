import { getOntologyFamily } from '../ontology-families.js';
import { getSlotY } from './graph-data.js';

export const FAMILY_COLORS = {
    'CIDOC CRM': { fill: '#ffe8a6', stroke: '#d6b85c' },
    'CRMarchaeo': { fill: '#f6c7a6', stroke: '#d99a6d' },
    CRMdig: { fill: '#c9dfb8', stroke: '#94b779' },
    CRMsci: { fill: '#b8dce8', stroke: '#73aebe' },
    CRMgeo: { fill: '#d4c3e6', stroke: '#a889c5' },
    Literal: { fill: '#e3e5e8', stroke: '#b7bec7' }
};

export function getNodeStyle(node) {
    const family = getOntologyFamily(node.ontologyClass || node.ontologyClassCode);
    const colors = FAMILY_COLORS[family] || FAMILY_COLORS.Literal;

    return {
        rounded: true,
        whiteSpace: 'wrap',
        html: false,
        fillColor: colors.fill,
        strokeColor: colors.stroke,
        strokeWidth: 1,
        fontColor: '#102033',
        fontSize: 12,
        align: 'center',
        verticalAlign: 'top',
        spacingTop: 14,
        spacingLeft: 10,
        spacingRight: 10,
        spacingBottom: 10,
        spacing: 10
    };
}

export function getEdgeStyle(edge, edgeSlots) {
    const outgoingEdgeIds = edgeSlots.outgoing.get(edge.source) || [];
    const incomingEdgeIds = edgeSlots.incoming.get(edge.target) || [];

    const exitY = getSlotY(edge.id, outgoingEdgeIds);
    const entryY = getSlotY(edge.id, incomingEdgeIds);

    return {
        rounded: false,
        //edgeStyle: 'orthogonalEdgeStyle',
        strokeColor: '#8a97a6',
        strokeWidth: 1.5,
        endArrow: 'block',
        html: true,
        fontColor: '#52606d',
        fontSize: 10,
        labelBackgroundColor: '#ffffff',
        labelBorderColor: '#d8e0e8',
        exitX: 1,
        exitY,
        entryX: 0,
        entryY
    };
}

export function getPortLabelStyle() {
    return {
        rounded: false,
        whiteSpace: 'nowrap',
        html: true,
        fillColor: '#ffffff',
        strokeColor: '#b8c4d2',
        strokeWidth: 1,
        fontColor: '#52606d',
        fontSize: 9,
        align: 'center',
        verticalAlign: 'middle',
        movable: false,
        resizable: false
    };
}

export function getNodeTitleLabelStyle() {
    return {
        rounded: false,
        whiteSpace: 'nowrap',
        html: false,
        fillColor: 'none',
        strokeColor: 'none',
        fontColor: '#102033',
        fontSize: 11,
        fontStyle: 1,
        align: 'center',
        verticalAlign: 'middle',
        movable: false,
        resizable: false
    };
}
