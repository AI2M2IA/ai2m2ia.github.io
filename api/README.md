# AI(2)M(2)IA Static Books API

Static JSON contract served from GitHub Pages.

## Endpoints

- Catalog: `/api/catalog.json`
- Book content: `/api/books/<book-id>/content.json`
- Book covers: `/api/books/<book-id>/cover.jpg`
- Schemas: `/api/schemas/catalog.schema.json` and `/api/schemas/content.schema.json`

Some catalog entries can intentionally expose `coverUrl: null`. At the moment,
volumes 17-30 of `The Last Archive` do not have public cover files yet; clients
should render their fallback cover state until those assets are added.

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

`npm run build:api` intentionally has no machine-specific default workspace.
Set `AI2M2IA_WORKSPACE` or pass both source directories explicitly:

```bash
AI2M2IA_WORKSPACE=/path/to/workspace npm run build:api

python3 tools/api/scripts/build_catalog.py \
  --aws-book-dir /path/to/book-lets-build-on-aws-together \
  --last-archive-dir /path/to/the-last-archive
```

For publication safety, `--out-dir` must stay inside this repository.
