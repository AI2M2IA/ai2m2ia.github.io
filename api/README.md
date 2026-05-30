# AI(2)M(2)IA Static Books API

Static JSON contract served from GitHub Pages.

## Endpoints

- Catalog: `/api/catalog.json`
- Book content: `/api/books/<book-id>/content.json`
- Book covers: `/api/books/<book-id>/cover.jpg`
- Schemas: `/api/schemas/catalog.schema.json` and `/api/schemas/content.schema.json`

Production URLs use the canonical site origin:

```text
https://ai2m2ia.github.io/api/catalog.json
https://ai2m2ia.github.io/api/books/<book-id>/content.json
```

## Contract

The catalog contains `schemaVersion`, generation metadata, and absolute
`manifestUrl` values for each book. Clients should fetch the catalog first and
then follow each book's `manifestUrl`.

## Validation

From this repository root:

```bash
npm run test:api:contract
```

## Build Tools

The API build and validation tools live in `tools/api`. The generator is
currently Python; contract validation and tests run in Node.js through
`package.json`, using AJV against the JSON Schemas plus local integrity checks.

```bash
npm run build:api
npm run test:api
```
