export function getOntologyFamily(uriOrCode) {
    const value = String(uriOrCode || '').toLowerCase();

    if (value.includes('crmarchaeo') || value.startsWith('ap') || value.startsWith('a')) {
        return 'CRMarchaeo';
    }

    if (value.includes('crmdig') || value.startsWith('d')) {
        return 'CRMdig';
    }

    if (value.includes('crmsci') || value.startsWith('s') || value.startsWith('o')) {
        return 'CRMsci';
    }

    if (value.includes('crmgeo') || value.startsWith('sp')) {
        return 'CRMgeo';
    }

    if (value.includes('rdf-schema') || value.includes('literal') || value === 'literal') {
        return 'Literal';
    }

    if (value.includes('cidoc-crm') || value.startsWith('e') || value.startsWith('p')) {
        return 'CIDOC CRM';
    }

    return 'Other';
}