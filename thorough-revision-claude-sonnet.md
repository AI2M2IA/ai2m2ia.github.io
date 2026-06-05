# Thorough Revision — Claude Sonnet 4.6

Projeto analisado: `ai2m2ia.github.io`

Data da revisão: 2026-06-05

---

# Análise Completa — ai2m2ia.github.io

## Visão Geral da Arquitetura

Site estático GitHub Pages (HTML/CSS/JS vanilla), sem framework ou bundler, hospedado via `github.io`. Arquitetura intencional de **zero dependências de produção** — todas as devDependencies são ferramentas de teste. A estrutura divide-se em:

- `index.html` + `styles.css` + `app.js` + `theme-init.js` → site principal
- `pwa/` → Progressive Web App de leitura com Service Worker
- `data/` → JSON estático servindo como "API"
- `works/*/index.html` → páginas individuais de obras
- `api/` → catálogo estático para o PWA
- `tests/` → testes E2E (Playwright) + testes unitários (Node test runner)

---

## Segurança

### Pontos Fortes

**CSP bem configurado** (`index.html:11`):
```
default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'
```
Sem `unsafe-inline`, sem `unsafe-eval`. Excelente postura para um site estático.

**Funções de segurança bem implementadas** (`app.js:541-573`):
- `escapeHtml()` — escapa todos os 5 caracteres críticos (`&`, `<`, `>`, `"`, `'`)
- `safeUrl()` — valida protocolo (só `http:`/`https:`) e origem, com flag `external` explícita
- `safeMediaId()`, `isSafeYouTubeId()`, `isSafeTikTokId()` — whitelist por regex para IDs de embed
- Uso **consistente** dessas funções em todos os templates de `innerHTML`

**Sandbox em iframes** (`app.js:767`):
```js
iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
```
Limita o que embeds do YouTube/TikTok podem fazer.

**`theme-init.js`** (`theme-init.js:9-12`) valida o lang salvo no localStorage com regex antes de aplicá-lo ao `<html>`, prevenindo injeção de atributos.

**Referrer policy** restrito: `strict-origin-when-cross-origin` no HTML.

### Problemas / Melhorias

**1. CSP via `<meta>` em vez de header HTTP** — Meta CSP não protege contra ataques de injeção de frame (clickjacking). Como é GitHub Pages, não é possível controlar headers HTTP diretamente, então a limitação é estrutural. Porém, falta o header `X-Frame-Options` simulado — não aplicável via meta tag. *(Limitação da plataforma, não do código.)*

**2. `cache: 'no-cache'` para todos os fetches de dados** (`app.js:462`):
```js
const response = await fetch(url, { cache: 'no-cache' });
```
A intenção é comparar `lastUpdated` para invalidação, mas na prática está fazendo **uma request de rede completa para cada dado a cada visita**, mesmo quando a cache está fresca. A lógica compara `lastUpdated` *depois* de baixar o arquivo inteiro — isso anula o benefício de cache do navegador. Seria mais eficiente usar `cache: 'default'` + `ETag`/`If-Modified-Since` (se o servidor suportar), ou confiar apenas no `localStorage` com TTL explícito.

**3. Ausência de `Subresource Integrity (SRI)`** — como os assets são próprios (`'self'`), não é crítico, mas se algum dia CDN for adotado, não há proteção.

**4. O `safeUrl` interno bloqueia URLs externas por padrão, mas `safeUrl(work.coverImage)`** assume que `coverImage` é sempre same-origin — se um arquivo JSON com dados maliciosos fosse servido, a cobertura funciona. O ponto fraco é que a validação de schema JSON dos arquivos de dados **não é aplicada em runtime**, apenas em CI. Um arquivo `works.json` corrompido (servido via CDN comprometido, por exemplo) passaria pelos renderers sem validação de schema.

**5. `localStorage` como cache de dados sensíveis**: dados de catálogo (incluindo URLs de Amazon) ficam em localStorage. Não são dados de usuário, mas vale documentar.

---

## Acessibilidade

### Pontos Fortes

- **Skip link** implementado corretamente com `position: fixed; top: -120px` e `focus { top: 16px }` — funcional
- **`aria-label`** em todos os botões de ícone (tema, menu, controles)
- **`aria-expanded`/`aria-haspopup`** no dropdown de idioma — correto
- **`role="tablist"`** + `aria-selected` nos filtros de gênero — semântica correta
- **`aria-labelledby`** em todas as sections ligando ao heading correspondente
- **`tabindex="-1"` no `<main>`** para que o skip link funcione programaticamente
- **`aria-hidden="true"`** em ícones/elementos decorativos
- Suporte a **RTL** (árabe, persa, hebraico, urdu) — regras CSS dedicadas em `styles.css:1537-1557`, flip do `border-left` da hero note, reverse do flex para navegação
- **`:focus-visible`** corretamente implementado (não `:focus` genérico) — não polui usuários de mouse
- Elementos de collage de personagens usam `role="button" tabindex="0"` com listeners de teclado (Enter/Space)
- **`loading="eager"` nas duas primeiras imagens do collage**, `lazy` nas demais — correto para LCP
- O `lang` do documento é atualizado dinamicamente ao mudar idioma

### Problemas

**1. Dropdown de idioma usa `role="menu"` mas os itens têm `role="menuitem"`** — correto formalmente, mas o padrão ARIA para `combobox`/`listbox` de seleção de idioma seria `role="listbox"` + `role="option"`, pois é uma lista de seleção com estado "selected", não um menu de ações. O `aria-selected` atual nos `lang-option` não está no spec de `menuitem`. Minor, mas tecnicamente incorreto para leitores de tela.

**2. Imagens de personagens no collage hero** usam `alt="Rowan Vale — spoiler-light character portrait"` — bom, mas as imagens são também `role="button"`, então o `alt` serve de nome acessível *apenas* se o usuário navegar pelo `img`, não pelo contêiner `div`. O nome do botão deveria vir do `aria-label` no `div.collage-item`, que existe (`aria-label="Rowan Vale — Level Zero and Analyze"`) — OK, mas há redundância com o `alt` da imagem dentro que é diferente. Screen readers leem os dois.

**3. `<section class="hero-section" aria-label="Introduction">`** — não tem heading (`h1` está dentro, mas é `h1` da página). Tecnicamente OK pois o `aria-label` identifica a região, mas seria mais semântico com `aria-labelledby` apontando para o `h1`.

**4. Cards de livro e personagem são `<article>`** mas sem `aria-label` individual — um leitor de tela navega por landmarks e anuncia "article" sem contexto do título. Adicionar `aria-label` ao `<article class="book-card">` com o título do livro seria ideal.

**5. Filtros de catálogo**: os botões têm `role="tab"` mas não estão dentro de um `role="tabpanel"` associado. A seção filtrada não tem `aria-controls` linking ao panel de resultados, e o grid de livros não tem `role="tabpanel"`. A semântica ARIA de tabs requer que cada `tab` tenha `aria-controls` e cada painel `role="tabpanel"` com `aria-labelledby`. Atualmente é visualmente um tablist mas semanticamente incompleto.

**6. Contraste de cores — light mode**: `--text-muted: #5a5248` sobre `--bg-card: #ffffff` = ratio ~5.4:1 (passa AA). `--text-faint: #6a6058` sobre branco = ~4.5:1 (limítrofe AA para textos normais). Textos com `font-size: 0.68rem` (badges de genre tag) em light mode têm contraste preocupante — texto pequeno precisa de ratio 4.5:1 para AA normal, ou 7:1 para AAA.

**7. Mobile menu** fecha ao clicar em um link, mas **não fecha ao pressionar Escape**, e não há `inert` ou focus trap enquanto está aberto — um usuário de teclado pode "escapar" da navegação mobile sem fechar o menu.

**8. Audit panel** usa `panel.inert = !this.open` — excelente. Mas o `max-height: 0` com `overflow: hidden` para animação pode esconder conteúdo de leitores de tela que ignoram CSS. O `aria-hidden="true"` quando fechado e `inert` cobrem isso, mas depende de JS estar funcionando.

---

## Performance

### Pontos Fortes

- **Zero dependências de runtime** — nenhum framework, nenhum bundle, carregamento direto
- Imagens em **WebP** (`CHAR-ROWAN.webp` etc.) — formato moderno
- `theme-init.js` carregado **sem `defer`** intencionalmente para prevenir FOUC
- `app.js` carregado com **`defer`** — não bloqueia parsing
- Cache busting via query string (`?v=20260601a`) para CSS/JS
- Lazy loading de embeds YouTube/TikTok — carregados apenas ao clicar
- `{ passive: true }` no scroll listener

### Problemas

**1. `fetch(url, { cache: 'no-cache' })` para todos os dados** (detalhado na seção de segurança) — impacto de performance real: 4 requests de rede completas a cada carregamento de página (`works.json`, `author.json`, `media.json`, `sources.json`), independente de a cache do navegador ser válida.

**2. Sem `preload` para fontes ou imagens críticas** — as fontes (`Cormorant Garamond`, `Inter`) não têm `<link rel="preload">`. Dependendo de como `assets/fonts/fonts.css` as declara, pode haver FOUT (Flash of Unstyled Text).

**3. `Promise.allSettled` para carregar dados** (`app.js:500-512`) — correto, mas os 4 fetches são feitos em paralelo sem priorização. `works.json` (crítico, renderiza catalog) poderia ser prioritizado.

**4. Hero collage**: 4 imagens carregadas com `loading="eager"` nas primeiras duas e `lazy` nas últimas duas. Correto, mas se o layout mudar responsivamente, as imagens "lazy" podem ser o conteúdo visible acima da dobra.

---

## Escalabilidade

O projeto está bem posicionado como site estático, mas há limitações estruturais:

**1. i18n com cache localStorage** — a estratégia de cache por `lastUpdated` é funcional para pequenas cargas. Com 23 idiomas × 4 dados, o localStorage pode atingir limites em dispositivos com pouco espaço (o código já trata com try/catch, mas degrada silenciosamente).

**2. Catálogo renderizado inteiramente via `innerHTML`** — funciona para dezenas de livros. Com centenas, a string concatenação e o reflow do DOM seriam problemáticos. Não é um problema atual, mas a ausência de virtualização/paginação é uma dívida futura se o catálogo crescer.

**3. Service Worker com `STATIC_CACHE = "ai2m2ia-pwa-static-v15"`** — versão hardcoded no código. A atualização requer mudança manual + redeploy. Nenhum mecanismo de auto-invalidação baseado em hash de arquivo.

**4. O PWA (`pwa/sw.js`)** tem `STATIC_ASSETS` com `./assets/app.js?v=14"` — a versão do app.js no SW não está sincronizada com o `?v=20260601a` usado no site principal. Isso pode causar serving de versão desatualizada.

**5. API estática** (`api/catalog.json`) duplica parcialmente os dados de `data/works.json` — não há single source of truth clara. O script `build:api` gera `api/catalog.json` a partir de `data/`, mas se alguém editar um dos dois diretamente, há risco de divergência sem CI que force rebuild.

---

## Arquitetura

### Pontos Fortes

- **Separação de responsabilidades clara**: `ThemeManager`, `I18N`, `DataStore`, `CatalogRenderer`, `CharacterRenderer`, `MediaRenderer`, `PhilosophyRenderer`, `AuditPanel`, `HeroCollage`, `MobileNav`, `ScrollBehavior` — cada módulo com responsabilidade única
- **`'use strict'`** habilitado
- **Error boundaries explícitos** em cada seção do `DOMContentLoaded` — falha em uma seção não derruba as outras
- **Fallback offline** no PWA com resposta 503 JSON diferenciada para JSON vs outros tipos
- Schema JSON para validação dos dados (`data/schemas/`)
- Documentação de segurança em `SECURITY.md` — prática incomum e positiva
- **`AGENTS.md`** com instruções para agentes AI — mostra consciência sobre o contexto de desenvolvimento

### Problemas

**1. `fetchJson` (`app.js:515-519`) está definido mas nunca usado** — `DataStore` usa `_loadWithCache` internamente. `fetchJson` é dead code.

**2. `window.MediaRenderer = MediaRenderer`** (`app.js:783`) — expõe o renderer globalmente, possivelmente para uso em outras páginas. Sem comentário explicando o porquê, é um vazamento de escopo não documentado.

**3. Re-fetch completo a cada troca de idioma** — `I18N.set()` chama `CatalogRenderer.render()` e `PhilosophyRenderer.render()`, que reconstroem todo o DOM. Para o usuário, parece instantâneo, mas em dispositivos lentos com catálogos maiores pode causar jank.

**4. `localStorage` como única fonte de preferências** — sem fallback para `sessionStorage` ou cookies quando localStorage está desabilitado (modo privado em Safari, por exemplo). O código não trata `localStorage` indisponível na leitura inicial do tema (`theme-init.js` usa `localStorage.getItem` sem try/catch).

**5. Versionamento de cache inconsistente**: `styles.css?v=20260601a` usa data + sufixo de letra, enquanto `app.js?v=14` no SW usa número sequencial — dois sistemas de versão diferentes no mesmo projeto.

---

## Testes

### Pontos Fortes

- **Playwright** para E2E com projetos separados: desktop-chrome, mobile-chrome, mobile-safari, pwa, works
- **`@axe-core/playwright`** para testes de acessibilidade automatizados
- **Testes unitários** para funções de segurança (`security.test.js`) com cobertura explícita de XSS payloads
- **Configuração de produção separada** (`playwright.prod.config.js`) para smoke tests no ambiente real
- Cobertura mínima configurada: 80% linhas, branches, funções
- `test:data` para validação de schema dos JSONs

### Problemas

**1. `tests/security.test.js` duplica as funções** que testa em vez de importá-las de `app.js` — risco de drift: a implementação real pode mudar sem que os testes falhem, pois testam uma cópia diferente.

**2. Sem testes para `I18N`** além do básico em `i18n.test.js` — troca de idioma, fallback quando JSON não existe, e re-render de seções não são cobertos explicitamente.

---

## Resumo Executivo

| Dimensão | Nota | Observação |
|---|---|---|
| **Segurança** | ★★★★☆ | Excelente para um site estático. Ponto fraco: validação de schema só em CI, não em runtime. |
| **Acessibilidade** | ★★★☆☆ | Boa base. Falhas em ARIA semântico de tabs e menu de idioma; mobile nav sem trap de foco. |
| **Performance** | ★★★☆☆ | `no-cache` em todos os fetches é o maior problema. Estrutura leve compensa. |
| **Arquitetura** | ★★★★☆ | Clara, modular, documentada. Dead code e inconsistências de versionamento são facilmente corrigíveis. |
| **Escalabilidade** | ★★★☆☆ | Adequada para o tamanho atual. Limitações aparecem com crescimento do catálogo ou número de idiomas. |
| **Testes** | ★★★★☆ | Cobertura ampla. Ponto fraco: testes de segurança testam cópias das funções, não as originais. |

### Prioridades de correção

1. **`cache: 'no-cache'`** → trocar por estratégia baseada em `ETag` ou TTL local para reduzir requests desnecessárias
2. **Semântica ARIA dos filtros de catálogo** → adicionar `aria-controls` nos tabs e `role="tabpanel"` no grid
3. **Mobile nav sem Escape/focus trap** → implementar para usuários de teclado
4. **Sincronização de versão no Service Worker** → `app.js?v=14` diverge do `?v=20260601a` do site
5. **`fetchJson` dead code** → remover
