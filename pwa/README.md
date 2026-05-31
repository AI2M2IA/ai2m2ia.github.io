# AI(2)M(2)IA Books PWA

Static Progressive Web App for GitHub Pages. It consumes the public contract in `/api/catalog.json`, uses Cache API + service worker for offline reading, and saves reading progress in `localStorage`.
When a resource is not cached yet and the network drops, the service worker
returns a readable 503 fallback instead of an undefined response.

## Local Development

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/pwa/`.

## Tests

From the repository root:

```bash
npm run test:pwa
```

## Publishing

Publish this directory as part of the `ai2m2ia.github.io` repository GitHub Pages site. The app is available at `/pwa/` and does not need a build step.
