let activeApiPrefix = '/arches/local/api';

function scopePath() {
    const pathname = new URL(self.registration.scope).pathname;
    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function withoutScope(pathname) {
    const basePath = scopePath();

    if (basePath && pathname.startsWith(basePath + '/')) {
        return pathname.slice(basePath.length);
    }

    return pathname;
}

function scopedPath(pathname) {
    return scopePath() + pathname;
}

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SET_ARCHES_API_PREFIX') {
        activeApiPrefix = event.data.apiPrefix || '/arches/local/api';
        console.log('[CIDOCAdapter] active API prefix set', activeApiPrefix);
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const pathname = withoutScope(url.pathname);

    const isVendorMainJs = pathname === '/cidoc-periodic-table/main.js';

    if (isVendorMainJs) {
        event.respondWith(loadPatchedVendorMainJs(event.request));
        return;
    }

    const isCidocJson =
        pathname === '/cidoc-periodic-table/cidoc7.1.json' ||
        pathname === '/cidoc-periodic-table/cidoc6.2.1.json';

    if (isCidocJson) {
        event.respondWith(loadArchesCidocData());
        return;
    }
});

async function loadPatchedVendorMainJs(request) {
    const response = await fetch(request, {
        cache: 'no-store'
    });

    let source = await response.text();

    source = source.replace(
        /function isCidocName\(string\)\{\s*let regex = \/\^\[E,P,L,D\]\\d\{1,3\}\.\*\\_\.\*\/gm\s*return\(regex\.test\(string\)\);\s*\}/,
        `function isCidocName(string){
    return /^(E|D|A|S|I|SP|P|L|AP|J|O)\\d{1,3}.*\\_.*/.test(string || "");
}`
    );

    source = source.replace(
        /function isCidocCode\(code\)\{\s*let regex = \/\^\[E,P,L,D\]\\d\{1,3\}\/gm\s*return\(regex\.test\(code\)\)\s*\}/,
        `function isCidocCode(code){
    return /^(E|D|A|S|I|SP|P|L|AP|J|O)\\d{1,3}/.test(code || "");
}`
    );

    source = source.replace(
        /function isCidocClass\(code\)\{\s*\/\/TODO: dinamically find letters and kind from json\s*return \(code\.startsWith\("E"\) \|\| code\.startsWith\("D"\)\);\s*\}/,
        `function isCidocClass(code){
    return /^(E|D|A|S|I|SP)\\d{1,3}/.test(code || "");
}`
    );

    source = source.replace(
        /function isCidocProperty\(code\)\{\s*return \(code\.startsWith\("P"\) \|\| code\.startsWith\("L"\)\);\s*\}/,
        `function isCidocProperty(code){
    return /^(P|L|AP|J|O)\\d{1,3}/.test(code || "");
}`
    );

    source = `console.log('[CIDOCAdapter] patched vendor main.js loaded');\n${source}`;

    return new Response(source, {
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store'
        }
    });
}

async function loadArchesCidocData() {
    const response = await fetch(scopedPath(activeApiPrefix + '/cidoc-periodic-table'), {
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
    const vendorClasses = data.classes.filter((entry) => isVendorClassId(entry.id));
    const vendorProperties = data.properties.filter((entry) => isVendorPropertyId(entry.id));

    const classIds = new Set(vendorClasses.map((entry) => entry.id));
    const propertyIds = new Set(vendorProperties.map((entry) => entry.id));

    const classes = vendorClasses.map((entry) => convertClass(entry, classIds));

    const properties = vendorProperties
        .map((entry) => convertProperty(entry, classIds, propertyIds))
        .filter(Boolean);

    console.log('[CIDOCAdapter] converted data', {
        classes: classes.length,
        properties: properties.length,
        skippedClasses: data.classes.length - classes.length,
        skippedProperties: data.properties.length - properties.length
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

function isVendorClassId(id) {
    return /^(E|D|A|S|I|SP)\d{1,3}/.test(id || '');
}

function isVendorPropertyId(id) {
    return /^(P|L|AP|J|O)\d{1,3}/.test(id || '');
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