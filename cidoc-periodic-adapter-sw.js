self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    const isCidocJson =
        url.pathname === '/cidoc-periodic-table/cidoc7.1.json' ||
        url.pathname === '/cidoc-periodic-table/cidoc6.2.1.json';

    if (!isCidocJson) {
        return;
    }

    event.respondWith(loadArchesCidocData());
});

async function loadArchesCidocData() {
    const response = await fetch('/api/cidoc-periodic-table', {
        credentials: 'include'
    });

    if (!response.ok) {
        return response;
    }

    const archesData = await response.json();
    const remogrilloData = convertArchesCidocToRemogrilloFormat(archesData);

    return new Response(JSON.stringify(remogrilloData), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function convertArchesCidocToRemogrilloFormat(data) {
    const classIds = new Set(data.classes.map((entry) => entry.id));
    const propertyIds = new Set(data.properties.map((entry) => entry.id));

    const classes = data.classes.map((entry) => convertClass(entry, classIds));

    const properties = data.properties
        .map((entry) => convertProperty(entry, classIds, propertyIds))
        .filter(Boolean);

    console.log('[CIDOCAdapter] converted data', {
        classes: classes.length,
        properties: properties.length,
        originalClasses: data.classes.length,
        originalProperties: data.properties.length
    });

    return {
        'rdf:RDF': {
            '-xml:lang': 'en',
            '-xmlns:rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            '-xmlns:rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
            '-xmlns:owl': 'http://www.w3.org/2002/07/owl#',
            '-xml:base': 'http://www.cidoc-crm.org/cidoc-crm/',
            'rdf:Property': properties,
            'rdfs:Class': classes
        }
    };
}

function label(value) {
    return {
        '-xml:lang': 'en',
        '#text': value || ''
    };
}

function ref(value) {
    return {
        '-rdf:resource': value
    };
}

function refs(values) {
    const result = (values || []).map((value) => ref(value.id));

    return result.length === 1
        ? result[0]
        : result;
}

function convertClass(entry, classIds) {
    const converted = {
        '-rdf:about': entry.id,
        'rdfs:label': label(entry.label)
    };

    if (entry.comment) {
        converted['rdfs:comment'] = entry.comment;
    }

    const superclasses = (entry.superclasses || [])
        .filter((superclass) => classIds.has(superclass.id));

    if (superclasses.length) {
        converted['rdfs:subClassOf'] = refs(superclasses);
    }

    return converted;
}
function convertProperty(entry, classIds, propertyIds) {
    const domain = (entry.domain || []).find((item) => classIds.has(item.id));
    const range = (entry.range || []).find((item) => classIds.has(item.id));

    if (!domain || !range) {
        return null;
    }

    const converted = {
        '-rdf:about': entry.id,
        'rdfs:label': label(entry.label),
        'rdfs:domain': ref(domain.id),
        'rdfs:range': ref(range.id)
    };

    if (entry.comment) {
        converted['rdfs:comment'] = entry.comment;
    }

    const superproperties = (entry.superproperties || [])
        .filter((superproperty) => propertyIds.has(superproperty.id));

    if (superproperties.length) {
        converted['rdfs:subPropertyOf'] = refs(superproperties);
    }

    return converted;
}