# Ontology Viewer Service

Standalone frontend service for exploring Arches ontology data.

It provides two views:

- Ontology Usage Explorer: resource model graph visualization using Cytoscape.js.
- CIDOC Periodic Table: embedded CIDOC CRM periodic table UI with an adapter for Arches data.

## Development

Run from this directory:

```powershell
npm install
npm run dev
```

The dev server runs at:

```text
http://localhost:9001
```

The Vite dev proxy expects Arches to be available at:

```text
http://localhost:8000
```

## Docker

Build from the repository root:

```powershell
docker build -t ontology-viewer-service ./ontology-visualizer
```

Run locally against an Arches instance on the host:

```powershell
docker run --rm -p 81:81 `
  -e ARCHES_DEV_BASE_URL=http://host.docker.internal:8000 `
  -e ARCHES_DEV_HOST_HEADER=localhost:8000 `
  ontology-viewer-service
```

The viewer is then available at:

```text
http://tezaurus:81
```

For another Arches host, change both environment variables:

```powershell
docker run --rm -p 81:81 `
  -e ARCHES_DEV_BASE_URL=https://your-arches-host.example `
  -e ARCHES_DEV_HOST_HEADER=your-arches-host.example `
  ontology-viewer-service
```

## API Usage

The service reads data from existing Arches endpoints:

- `/api/ontology-usage/models`
- `/api/ontology-usage/models/<graph_id>`
- `/api/ontology-usage/models/<graph_id>/layout`
- `/api/cidoc-periodic-table`

No Arches backend logic is duplicated in this service.

## CIDOC Periodic Table

The CIDOC Periodic Table UI is a vendored third-party component:

- Project: The CIDOC-crm Periodic Table
- Author: RemoGrillo
- Source: https://github.com/RemoGrillo/cidoc-crm_periodic_table
- License: MIT License

The original license is kept in:

```text
cidoc-periodic-table/LICENSE
```

The service uses a separate adapter service worker to feed Arches CIDOC data into the vendored UI without modifying its core code.
