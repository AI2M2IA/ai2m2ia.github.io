# Thorough Revision - Codex

Projeto analisado: `ai2m2ia.github.io`

Data da revisão: 2026-06-05

Escopo: análise read-only do projeto inteiro, cobrindo acessibilidade, segurança, escalabilidade, arquitetura, dados, PWA, API pública, testes e CI/CD.

## Sumário Executivo

O projeto tem uma base sólida para um site estático publicado via GitHub Pages. A postura geral é boa: não há dependências de produção, a superfície de execução é pequena, há Content Security Policy restritiva, validação de dados por JSON Schema, testes de contrato da API, testes de segurança para XSS, testes de i18n, testes Playwright e um PWA com validação de origem.

Não encontrei vulnerabilidade crítica evidente. Os principais riscos são de manutenção e qualidade evolutiva: duplicação manual entre dados, páginas estáticas e testes; semântica ARIA que pode ser refinada; geração da API que não remove artefatos antigos; e pequenos pontos de endurecimento de supply chain/CI.

## Estado do Repositório

O repositório já tinha alterações locais antes desta revisão:

- `.gitignore`
- `README.md`
- `tests/security.test.js`

Essas alterações foram tratadas como trabalho pré-existente do usuário.

## Verificações Executadas

### Passaram

```bash
npm run test:unit
```

Resultado: passou.

Inclui:

- `test:api:contract`
- `test:api:unit`
- `test:i18n`
- `test:security`
- `test:data`

```bash
npm audit --audit-level=high
```

Resultado: `found 0 vulnerabilities`.

### Observação sobre Playwright completo

Não executei a suíte Playwright completa para evitar geração ou alteração de artefatos como `playwright-report/` e `test-results/`, já que o pedido original foi "Não modifique nada". A análise dos testes foi feita por leitura do código e execução dos checks Node que não deveriam alterar o projeto.

## Arquitetura

### Estrutura Geral

O projeto é composto por:

- Site principal estático:
  - `index.html`
  - `app.js`
  - `styles.css`
  - `data/*.json`
- Páginas estáticas por obra:
  - `works/*/index.html`
  - `works/shared.js`
- API pública estática:
  - `api/catalog.json`
  - `api/books/*/content.json`
  - `api/schemas/*.json`
- PWA reader:
  - `pwa/index.html`
  - `pwa/assets/app.js`
  - `pwa/sw.js`
  - `pwa/manifest.webmanifest`
- Tooling:
  - `tools/api/lib/api-contract.js`
  - `tools/api/scripts/build_catalog.py`
  - `scripts/validate-data.js`
- Testes:
  - `tests/*.spec.js`
  - `tests/*.test.js`

### Pontos Fortes

- Separação clara entre site institucional, API pública e PWA.
- Dados estruturados com schemas.
- API pública validada por contrato.
- PWA consegue operar offline com Cache API e service worker.
- Testes cobrem i18n, segurança, dados, API, PWA, páginas de obras e acessibilidade.

### Riscos Arquiteturais

#### Arquivos centrais grandes

`app.js` tem aproximadamente 1003 linhas e `pwa/assets/app.js` tem aproximadamente 2052 linhas. Ainda é administrável, mas já existe custo cognitivo alto para evolução.

Recomendação:

- Extrair módulos conceituais:
  - `i18n`
  - `data-store`
  - `catalog-renderer`
  - `media-renderer`
  - `audit-panel`
  - `pwa/router`
  - `pwa/cache`
  - `pwa/render-reader`

#### Duplicação manual de rotas e obras

As obras aparecem em:

- `data/works.json`
- `works/*/index.html`
- `tests/works.spec.js`
- `tests/accessibility.spec.js`
- navegação/renderização no site principal

Exemplo: `tests/works.spec.js` mantém uma lista manual de slugs.

Risco: uma obra nova pode ser adicionada aos dados mas esquecida nos testes, ou uma página pode existir sem estar no catálogo.

Recomendação:

- Gerar listas de teste a partir de `data/works.json`.
- Validar que todo `workFamilies[].route` aponta para uma página existente.
- Validar que toda página em `works/*` aparece em `data/works.json`, salvo exceções documentadas.

## Segurança

### Postura Geral

A postura de segurança é forte para um site estático:

- Sem dependências de produção.
- CSP restritiva em `index.html`, `pwa/index.html` e páginas de obras.
- Sem `unsafe-inline` e sem `unsafe-eval`.
- Uso de `escapeHtml()`, `safeUrl()`, validação de IDs de mídia e validação de origem no PWA.
- Testes específicos para XSS e URL safety.
- `npm audit --audit-level=high` retornou 0 vulnerabilidades conhecidas.

### XSS

O site principal usa `innerHTML` em pontos controlados, especialmente:

- `app.js`: renderização do catálogo.
- `app.js`: renderização de personagens.
- `app.js`: renderização de mídia.
- `app.js`: painel de auditoria.

Em geral, os dados dinâmicos passam por `escapeHtml()` ou `safeUrl()`.

Trechos relevantes:

- `app.js`, renderização de catálogo: linhas próximas de 590-636.
- `app.js`, renderização de mídia: linhas próximas de 725-780.
- `app.js`, painel de auditoria: linhas próximas de 806-815.

O PWA tem um ponto sensível em:

- `pwa/assets/app.js`, `nodes.chapterBody.innerHTML = renderProse(...)`.

Esse ponto é mitigado pela estratégia "escape primeiro, formatação markdown depois". Há testes específicos cobrindo payloads de `<script>` e `<img onerror>`.

Recomendação:

- Manter a regra: qualquer novo uso de `innerHTML` precisa de teste de regressão.
- Considerar um helper de template seguro ou migração gradual para DOM APIs nas renderizações do site principal.

### CSP

A CSP está bem configurada para o contexto:

- `default-src 'self'`
- `script-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- frames limitados a YouTube nocookie e TikTok no site principal.

Recomendação:

- Continuar bloqueando `unsafe-inline` e `unsafe-eval`.
- Se futuramente houver analytics, anúncios ou formulários externos, revisar CSP antes da integração.

### Iframes de mídia

O carregamento de YouTube/TikTok é sob demanda, o que é bom para privacidade e performance.

O iframe usa sandbox:

```js
iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
```

Observação:

- `allow-same-origin` junto com `allow-scripts` reduz parte do isolamento do sandbox para conteúdo que compartilhe origem. Como YouTube/TikTok são origens externas, o risco é controlado, mas vale reavaliar se todos os recursos concedidos são necessários.

Recomendação:

- Confirmar se TikTok e YouTube funcionam sem todos os tokens atuais de `allow`.
- Manter validação rigorosa de IDs, como já existe.

### PWA e origem da API

O PWA aceita `?api=`, mas valida a origem:

- origem atual;
- origem canônica `https://ai2m2ia.github.io`;
- origens locais de desenvolvimento.

Isso evita typosquatting e origens arbitrárias. Há testes cobrindo esse comportamento.

Trechos relevantes:

- `pwa/assets/app.js`, `resolveConfiguredApiBaseUrl`.
- `pwa/assets/app.js`, `resolveApiUrl`.
- `pwa/assets/app.js`, `isTrustedBookAssetUrl`.

### Secrets

Varredura textual por padrões de segredo não encontrou credenciais reais. Apareceram apenas nomes documentais de secrets, como:

- `BOT_GH_TOKEN`
- `CLAUDE_CODE_AUTH_TOKEN`
- `QWEN_API_KEY`

Isso é aceitável.

## Acessibilidade

### Pontos Fortes

- Skip link na home.
- Uso de landmarks: `header`, `main`, `footer`, `nav`.
- `aria-expanded` em menus e painéis.
- `aria-hidden`/`inert` no painel de auditoria.
- Testes com axe para home, PWA e páginas de obras.
- Teste de contraste.
- Teste de hierarquia de headings.

### Achado 1: elementos com `role="button"` sem ação real

Na colagem do hero, os retratos são `div role="button" tabindex="0"`, mas a interação apenas muda destaque visual. Para leitor de tela, isso anuncia botões que não executam uma ação clara.

Arquivos:

- `index.html`, hero collage.
- `app.js`, `HeroCollage`.

Recomendação:

- Se a intenção é navegação, transformar em links reais para as obras/personagens.
- Se é apenas destaque decorativo, remover `role="button"` e `tabindex`, ou usar semântica de lista/galeria.
- Se deve ser uma seleção real, usar `aria-pressed`, estado selecionado e descrição clara.

### Achado 2: filtros com semântica de tabs incompleta

Os filtros do catálogo usam:

- `role="tablist"`
- `role="tab"`
- `aria-selected`

Mas não implementam o comportamento completo esperado de tabs, como navegação por setas e associação com painel via `aria-controls`.

Arquivos:

- `index.html`, filtros do catálogo.
- `app.js`, `CatalogRenderer._applyFilter`.

Recomendação:

- Opção A: implementar tabs corretamente com teclado e painel associado.
- Opção B: trocar para grupo de botões com `aria-pressed`, que combina melhor com filtros.

### Achado 3: skip link nas páginas de obras precisa de teste funcional

A home tem `main tabindex="-1"` e teste funcional do skip link. As páginas de obras têm skip link, mas nem todas parecem ter a mesma estrutura de foco.

Recomendação:

- Adicionar teste do skip link para todas as páginas em `works/*`.
- Garantir `main id="main-content" tabindex="-1"` nas páginas estáticas, ou ajustar o JS para focar corretamente.

### Achado 4: testes de acessibilidade são bons, mas alguns são rasos

O teste "interactive elements should be keyboard accessible" verifica basicamente se não há `tabindex` negativo. Isso não garante ativação por teclado nem fluxo de foco útil.

Recomendação:

- Testar interações reais por teclado:
  - abrir/fechar menu de idioma;
  - navegar filtros;
  - abrir painel de auditoria;
  - carregar embed por Enter/Espaço;
  - navegar capítulos no PWA.

## Dados e Contratos

### Pontos Fortes

- `data/*.json` validado contra schemas.
- `api/catalog.json` e manifests validados por contrato.
- Validação impede URLs de API fora do prefixo esperado.
- Cross-validation entre catálogo e manifests.

### Achado: integridade referencial parcial

Os schemas validam formato, mas nem sempre validam existência ou relacionamento:

- `workFamilies[].route` pode ter formato válido, mas página inexistente.
- `workIds` pode apontar para IDs sem fonte correspondente.
- `mediaIds` pode apontar para mídia inexistente.
- `characters[].workFamilyId` pode apontar para obra inexistente.

Recomendação:

- Criar validações adicionais em `scripts/validate-data.js`:
  - `route` existe no filesystem;
  - `mediaIds` existem em `data/media.json`;
  - `characters[].workFamilyId` existe em `workFamilies`;
  - slugs em `works/*` estão representados em `data/works.json`.

### Achado: build da API não remove artefatos antigos

`tools/api/scripts/build_catalog.py` escreve/atualiza catálogo e conteúdo, mas não limpa diretórios antigos em `api/books`.

Risco:

- Uma obra removida da fonte pode continuar acessível por URL direta.
- O catálogo não lista mais o item, mas o conteúdo antigo ainda fica publicado.

Recomendação:

- Gerar em diretório temporário e trocar atomicamente.
- Ou remover de `api/books` tudo que não foi produzido no build atual.
- Adicionar teste para garantir que todo diretório em `api/books/*` aparece no catálogo, salvo diretórios explicitamente permitidos.

## PWA

### Pontos Fortes

- Manifest correto, com ícones PNG e SVG.
- Service worker separa cache estático, cache de API e cache de assets.
- Fallback offline JSON/texto.
- Validação de URL para manifests, covers e assets de livro.
- Wishlist, downloaded books e progresso local via `localStorage`.

### Pontos de Atenção

#### Versionamento manual do service worker

O PWA usa:

- `ai2m2ia-pwa-static-v15`
- `ai2m2ia-pwa-assets-v15`
- `assets/app.js?v=14`

Risco:

- Inconsistência manual entre versão do app, cache e assets.

Recomendação:

- Centralizar versão em um script de build ou constante gerada.
- Testar que `pwa/index.html` e `pwa/sw.js` apontam para a mesma versão de `assets/app.js`.

#### Downloads offline e falhas parciais

`downloadBook` usa `Promise.allSettled` e só marca como offline se todos os assets forem cacheados. Isso é bom.

Sugestão:

- Exibir erro visível ao usuário quando parte do cache falha, não apenas `console.warn`.

## CI/CD e Supply Chain

### Pontos Fortes

- `npm ci` em CI.
- `npm audit --audit-level=high`.
- Playwright em CI.
- Actions importantes pinadas por SHA.
- Dependabot configurado para npm e GitHub Actions.
- CI separado de production smoke.

### Achado 1: action não pinada por SHA

Em `.github/workflows/prod-smoke.yml`, `actions/github-script@v7` usa tag móvel.

Recomendação:

- Piná-la por SHA, como já acontece em outros workflows.

### Achado 2: token de promoção pede permissão maior que o necessário

`auto-pr-promotion.yml` valida `.permissions.push`, mas a operação pretendida é criar/reusar PR.

Risco:

- Incentiva `BOT_GH_TOKEN` com escopo maior que o necessário.

Recomendação:

- Validar permissão compatível com PR write.
- Preferir GitHub App/fine-grained PAT com escopo mínimo.

### Achado 3: workflow de produção cria issue mas permissões declaram apenas `contents: read`

`prod-smoke.yml` tenta criar issue em falha. Para isso, normalmente precisa de `issues: write`.

Recomendação:

- Adicionar `issues: write` ao workflow se a criação de issue for parte esperada do processo.

## Performance

### Pontos Fortes

- Site estático.
- Imagens com `loading="lazy"` em várias áreas.
- Fontes locais.
- Embeds carregados sob demanda.
- Sem framework pesado.

### Pontos de Atenção

- `DataStore.loadAll()` carrega `works`, `author`, `media` e `sources` logo no início, mesmo se o usuário não abrir algumas seções.
- Hero usa imagens eager para duas portraits.
- PWA e site principal têm JS monolítico.

Recomendação:

- Lazy-load de `media.json` apenas quando a seção de mídia se aproxima/entra no viewport.
- Lazy-load de `sources.json` quando o painel de auditoria for aberto.
- Separar bundles/módulos se o projeto crescer, sem necessariamente adotar framework.

## Testes

### Pontos Fortes

- Boa cobertura de regressão para:
  - i18n;
  - CSP;
  - XSS;
  - URL safety;
  - PWA;
  - contrato da API;
  - páginas de obras;
  - acessibilidade via axe.

### Lacunas Recomendadas

- Derivar listas de obras dos dados, não de arrays manuais.
- Testar integridade referencial de `data/works.json`.
- Testar skip link nas páginas de obras.
- Testar navegação por teclado das principais interações.
- Testar sincronização de versões do PWA.
- Testar que `api/books/*` não contém diretórios órfãos fora do catálogo.

## Priorização

### Alta Prioridade

1. Corrigir semântica dos filtros: tabs completas ou grupo de botões com `aria-pressed`.
2. Ajustar a colagem do hero para não anunciar botões sem ação real.
3. Validar integridade referencial em `scripts/validate-data.js`.
4. Garantir que o build da API não deixe artefatos antigos.

### Média Prioridade

1. Pin de `actions/github-script@v7` por SHA.
2. Revisar permissões de `prod-smoke.yml` para criação de issues.
3. Reduzir escopo esperado do `BOT_GH_TOKEN`.
4. Centralizar/versionar assets do PWA.

### Baixa Prioridade

1. Modularizar gradualmente `app.js` e `pwa/assets/app.js`.
2. Lazy-load de dados não essenciais no primeiro render.
3. Melhorar feedback visual/usuário em falhas parciais de download offline.

## Conclusão

O projeto tem uma base técnica boa e uma mentalidade de segurança claramente presente. O principal trabalho agora não é "apagar incêndio"; é prevenir erosão conforme o catálogo, a API e o PWA crescem.

O melhor próximo passo seria fortalecer validações automáticas de integridade e ajustar a semântica de acessibilidade. Isso preserva a simplicidade do site estático sem deixar a manutenção depender de memória humana ou listas duplicadas.
