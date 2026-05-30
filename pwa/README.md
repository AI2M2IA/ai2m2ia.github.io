# AI(2)M(2)IA Books PWA

Progressive Web App estática para GitHub Pages. Ela consome o contrato público em `/api/catalog.json`, usa Cache API + service worker para leitura offline e salva progresso no `localStorage`.

## Desenvolvimento local

```bash
python3 -m http.server 4173
```

Abra `http://localhost:4173/pwa/`.

## Testes

From the repository root:

```bash
npm run test:pwa
```

## Publicação

Publique este diretório como parte do GitHub Pages do repositório
`ai2m2ia.github.io`. O app fica disponível em `/pwa/` e não precisa de build.
