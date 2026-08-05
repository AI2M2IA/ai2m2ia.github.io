# AI(2)M(2)IA Static Books API

Static JSON contract served from GitHub Pages, describing the hub-and-spoke
book catalog: each entry points to a book's own independently deployed site
("spoke"), not to content hosted in this repository.

## Endpoints

- Catalog: `/api/catalog.json`
- Schema: `/api/schemas/catalog.schema.json`

There is no per-book content or cover endpoint in this repository. Each
catalog entry's `spokeUrl` points to that book's own site, and `coverUrl`
(when present) is an absolute URL to an image hosted there or in this
repository's own `assets/`. A book with no independent spoke (for example,
a title sold only through a third-party storefront) is simply not listed in
`catalog.json` rather than stubbed with a placeholder entry.

Production URL uses the canonical site origin:

```text
https://ai2m2ia.github.io/api/catalog.json
```

## Contract

The catalog contains `schemaVersion`, generation metadata, and one entry per
book with a required, unique, HTTPS `spokeUrl`. Clients should fetch the
catalog and treat each `spokeUrl` as the book's canonical reading destination.
See `api/schemas/catalog.schema.json` and `tools/api/lib/api-contract.js` for
the full set of required fields and validation rules.

## Validation

From this repository root:

```bash
npm run test:api:contract
```

## Maintenance

`api/catalog.json` is currently maintained by hand and validated with the
command above; there is no generator script. (An earlier Python generator,
`tools/api/scripts/build_catalog.py`, was removed when the catalog moved to
the spoke model — see the `refactor(pwa): hub-and-spoke` commit — and no
`npm run build:api` command exists today.) When adding a book with its own
independent spoke site, add its entry directly to `api/catalog.json` and run
the validation command above before committing.
