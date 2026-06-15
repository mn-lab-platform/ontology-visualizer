export const ARCHES_INSTANCES = [
    // {
    //     id: 'local',
    //     label: 'Local Arches',
    //     apiPrefix: '/arches/local/api'
    // },
    {
        id: 'dev',
        label: 'Dev Arches',
        apiPrefix: '/arches/dev/api'
    }
];

const STORAGE_KEY = 'ontology-viewer-active-arches';

export function getActiveArchesId() {
    return localStorage.getItem(STORAGE_KEY) || ARCHES_INSTANCES[0].id;
}

export function setActiveArchesId(id) {
    localStorage.setItem(STORAGE_KEY, id);
}

export function getActiveArches() {
    const activeId = getActiveArchesId();

    return ARCHES_INSTANCES.find((instance) => instance.id === activeId)
        || ARCHES_INSTANCES[0];
}