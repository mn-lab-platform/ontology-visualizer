# Ontology Viewer Service

Standalone frontend service for exploring Arches ontology data.

It provides two views:

- Diagram Editor: resource model graph visualization and editing using maxGraph.
- CIDOC Periodic Table: embedded CIDOC CRM periodic table UI with an adapter for Arches data.

## Development

Run from this directory:

```powershell
Copy-Item .env.example .env
# Set the Arches URLs and host headers in .env.
npm install
npm run dev
```

The dev server runs at:

```text
http://localhost:9001
```

The Vite dev proxy uses the Arches base URLs configured in `.env`.

## Docker

Copy the environment template and set the values for your Arches instance:

```powershell
Copy-Item .env.example .env
```

Build and run the service:

```powershell
docker compose up -d --build
```

The viewer is then available at:

```text
http://localhost:81
```

`.env` is ignored by Git and the Docker build context. Commit only `.env.example`.


## API Usage

The service reads data from existing Arches endpoints:

- `/api/ontology-usage/models`
- `/api/ontology-usage/models/<graph_id>`
- `/api/cidoc-periodic-table`

No Arches backend logic is duplicated in this service.

## Saved Diagram Layouts

`Save layout` persists the current Diagram Editor layout through a local API. The API stores one JSON file per provider and resource model in the shared Docker volume `ontology_layouts`:

```text
<provider>/<resource-graph-id>.json
```

For example, a MAP Arches model is stored as `map/<resource-graph-id>.json`. When a model is loaded, a saved local layout takes precedence; otherwise the editor applies its automatic layout.

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
